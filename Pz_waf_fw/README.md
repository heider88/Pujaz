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

## Qué tener en cuenta

- **Docker Desktop (Windows y macOS) no conserva la IP del cliente:** todas las peticiones llegan con la IP de la máquina virtual de Docker, así que los límites se comparten entre todos los usuarios. En Linux sí se ve la IP real. La IP que ve el firewall aparece en el log: `docker compose logs pz-waf-fw`.
- **Pruebas de carga (lab 6):** k6 desde una sola máquina choca con los límites y recibe `429`. Agrega su IP a `listas/ip-confiables.conf` antes de correrlas.
- **No inspecciona el cuerpo de las peticiones.** Las firmas solo se buscan en la URL; una inyección dentro de una mutación GraphQL no la detecta el firewall. Para eso haría falta ModSecurity con las reglas OWASP CRS.
- **No distingue el login de otras operaciones,** porque todas van por `POST /graphql`. El límite de 10 peticiones/s por IP frena la fuerza bruta, pero un límite propio por cuenta tendría que ir en el gateway.
