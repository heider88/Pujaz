# Pz_waf_fw · Firewall de aplicación

Nginx delante de los dos proxies inversos. Es el único componente publicado hacia el host: todo el tráfico de la web y de la app móvil pasa por aquí antes de llegar a `pz-web-rp` y `pz-movil-rp`.

```
navegador ─▶ :8080 ┐                 ┌─▶ pz-web-rp   ─▶ pz-web-fe / pz-api-ag
                   ├─▶ pz-waf-fw ─────┤
app móvil ─▶ :8081 ┘   (red public)  └─▶ pz-movil-rp ─▶ pz-api-ag
                                      (red interna perimetro)
```

## Qué bloquea

| Regla | Respuesta | Dónde se configura |
|---|---|---|
| IP o rango en la lista negra | `403` | `listas/ip-bloqueadas.conf` |
| Más de 10 peticiones/s a `/graphql` por IP (ráfaga de 30) | `429` | `nginx.conf`, zona `api` |
| Más de 30 peticiones/s al resto por IP (ráfaga de 100, para los archivos de una página) | `429` | `nginx.conf`, zona `general` |
| Más de 30 conexiones abiertas a la vez por IP (incluye WebSocket) | `429` | `waf/reglas.conf`, `limit_conn` |
| Métodos distintos de `GET`, `HEAD`, `POST`, `OPTIONS` | `405` | `nginx.conf`, `$metodo_no_permitido` |
| Agentes de escáneres conocidos (sqlmap, nikto, nmap, nuclei…) | `403` | `nginx.conf`, `$agente_malicioso` |
| Firmas en la URL: `../`, `union select`, `<script`, `/etc/passwd`… | `403` | `nginx.conf`, `$uri_maliciosa` |
| Archivos ocultos (`.env`, `.git`) y rutas de escáneres (`wp-admin`, `.php`, `actuator`…) | `404` | `waf/reglas.conf` |
| Cuerpos de más de 1 MB | `413` | `client_max_body_size` |
| Conexiones lentas (slowloris): cabecera o cuerpo que tardan más de 10 s | se cierra | `client_header_timeout`, `client_body_timeout` |

Además, el firewall reemplaza `X-Forwarded-For` con la IP real del cliente, así que un cliente no puede hacerse pasar por otra IP. Los proxies inversos confían en `X-Real-IP` solo porque únicamente el firewall llega a ellos.

## Bloquear o eximir una IP

1. Agrega la línea en `listas/ip-bloqueadas.conf` (o en `listas/ip-confiables.conf` para que no cuente en los límites):
   ```
   203.0.113.7 1;
   198.51.100.0/24 1;
   ```
2. Recarga sin reiniciar:
   ```bash
   docker compose exec pz-waf-fw nginx -s reload
   ```

La carpeta `listas/` se monta en el contenedor, así que no hace falta reconstruir la imagen.

## Cómo probarlo

**Configuración.** El CI corre `nginx -t` sobre la imagen en el job `waf-config` y falla si la configuración tiene errores. Para revisarla a mano:

```bash
docker compose build pz-waf-fw
docker compose run --rm --no-deps pz-waf-fw nginx -t
```

**Reglas.** Con el sistema levantado (`docker compose up --build`), cada comando debe dar la respuesta indicada:

```bash
# Tráfico normal: 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8080/graphql?query=%7B__typename%7D"

# Rutas de escáneres y archivos ocultos: 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/.env
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/wp-admin/

# Agente de un escáner y firma de ataque en la URL: 403
curl -s -o /dev/null -w "%{http_code}\n" -A sqlmap http://localhost:8080/
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8080/?id=1%20UNION%20SELECT%20password"

# Método no permitido: 405
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:8080/graphql

# Peticiones demasiado seguidas: después de la ráfaga de 30 empiezan los 429
for i in $(seq 60); do curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:8080/graphql; done; echo

# Lo mismo por la entrada móvil (:8081)
curl -s -o /dev/null -w "%{http_code}\n" -A sqlmap http://localhost:8081/graphql
```

En el bucle, las primeras respuestas son un error del gateway (un `4xx` como `400`), porque la petición va sin consulta GraphQL y sí llega al gateway. Lo que importa es que después aparezcan los `429`: esas ya no pasan del firewall.

**IP bloqueada.**

1. Mira con qué IP llegas al firewall:
   ```bash
   curl -s -o /dev/null http://localhost:8080/
   docker compose logs --tail 1 pz-waf-fw
   ```
   La IP es el primer campo de la línea.
2. Agrégala en `listas/ip-bloqueadas.conf` (por ejemplo `172.18.0.1 1;`) y recarga con `docker compose exec pz-waf-fw nginx -s reload`.
3. `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/` debe dar `403`.
4. Quita la línea y vuelve a recargar.

Las peticiones bloqueadas por frecuencia también quedan en el log, con el mensaje `limiting requests`:

```bash
docker compose logs pz-waf-fw | grep "limiting"
```

## Qué tener en cuenta

- **Docker Desktop (Windows y macOS) no conserva la IP del cliente:** todas las peticiones llegan con la IP de la máquina virtual de Docker, así que los límites se comparten entre todos los usuarios. En Linux sí se ve la IP real. La IP que ve el firewall aparece en el log: `docker compose logs pz-waf-fw`.
- **Pruebas de carga (lab 6):** k6 desde una sola máquina choca con los límites y recibe `429`. Agrega su IP a `listas/ip-confiables.conf` antes de correrlas.
- **No inspecciona el cuerpo de las peticiones.** Las firmas solo se buscan en la URL; una inyección dentro de una mutación GraphQL no la detecta el firewall. Para eso haría falta ModSecurity con las reglas OWASP CRS.
- **No distingue el login de otras operaciones,** porque todas van por `POST /graphql`. El límite de 10 peticiones/s por IP frena la fuerza bruta, pero un límite propio por cuenta tendría que ir en el gateway.
