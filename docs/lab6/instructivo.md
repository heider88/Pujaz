# Laboratorio 6: Pruebas de rendimiento

**Entrega:** martes 17 de noviembre de 2026, en clase.

**Entregable:** curva de rendimiento (usuarios concurrentes vs. tiempo de respuesta) y su rodilla.

## Qué vamos a probar

La página principal de Pujaz (`/`), que muestra el catálogo de lotes. Cada visita recorre los cuatro componentes que pide el laboratorio:

```
Cliente (k6) → nginx :8080 → Pz_web_fe (Next.js, SSR)
                               → Pz_api_ag (GraphQL, query items)
                                 → Pz_catalogo_cl
                                   → Pz_catalogo_db (Mongo)
```

Es de solo lectura: no necesita login y no ensucia datos.

## Cómo lo vamos a montar

Usamos **dos GitHub Codespaces**, que son máquinas virtuales en los servidores de GitHub con el repo ya clonado:

| Codespace | Máquina | Qué hace |
|---|---|---|
| **Servidor** | 4 núcleos | Corre Pujaz con Docker y lo publica en una URL pública |
| **Cliente** | 2 núcleos | Corre k6 contra esa URL |

Son dos máquinas distintas, así que se cumple la regla de lanzar la carga desde un nodo independiente. Ninguno de nuestros portátiles carga con la prueba y la medición no depende del internet de las casas. Los dos Codespaces los puede abrir una sola persona desde su cuenta.

**Archivos de esta carpeta (`docs/lab6/`):**

| Archivo | Para qué |
|---|---|
| `performance_test.js` | Script de k6: pide `/` y revisa que el catálogo cargue |
| `correr_niveles.sh` | Corre los niveles 1 → 2000 usuarios y guarda cada resultado |
| `instructivo.md` / `.pdf` | Este documento |

---

## 0. Antes de empezar

Los Codespaces se crean desde lo que está en GitHub, así que la carpeta `docs/lab6/` tiene que estar subida a una rama (por ejemplo `developcito`). Si no está subida, en el Codespace cliente toca crear los dos scripts a mano copiándolos del repo local.

**Horas gratis:** las cuentas personales tienen unas 120 horas-núcleo al mes. Un servidor de 4 núcleos y un cliente de 2 núcleos durante 2 h gastan 12; sobra. **Apagar los dos Codespaces al terminar.**

**Suspensión:** un Codespace se suspende tras 30 min sin actividad. Para evitarlo: *GitHub → Settings → Codespaces → Default idle timeout* → subirlo (por ejemplo, 120 min).

---

## 1. Codespace servidor

### 1.1 Crearlo

En GitHub, en el repo: **Code → Codespaces → ⋯ → New with options**.
- **Branch:** la que tenga la versión a probar.
- **Machine type:** **4-core**. Pujaz levanta unos 14 contenedores; con 2 núcleos queda muy justo.

### 1.2 Levantar Pujaz (~10 min, por el build)

En la terminal del Codespace:

```bash
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
EOF

docker compose up -d --build
docker compose ps                                  # todos deben quedar "healthy"
curl -s localhost:8080 | grep -c "Reloj Vintage"   # debe dar 1 o más
```

### 1.3 Publicar el puerto 8080

1. Abrir la pestaña **Ports** (abajo, junto a la terminal).
2. En el puerto **8080**: clic derecho → **Port Visibility → Public**.
3. Sacar la URL pública:
   ```bash
   echo "https://${CODESPACE_NAME}-8080.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
   ```
   Queda algo como `https://nombre-raro-8080.app.github.dev`. **Esta es la URL que usa el cliente.**
4. Abrirla en el navegador para confirmar que se ven los lotes.

### 1.4 Durante las pruebas

Dejar la terminal con:

```bash
docker stats
```

Tomar captura del consumo de CPU y memoria en los niveles altos (sirve para el informe). Si algún contenedor se cae:

```bash
docker compose ps
docker compose restart <servicio>
```

---

## 2. Codespace cliente

### 2.1 Crearlo e instalar k6 (~5 min)

Crear otro Codespace del mismo repo y rama, de **2-core**. En su terminal (son los comandos de la guía para Ubuntu):

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install -y k6
k6 version
```

### 2.2 Prueba de humo (1 usuario)

Reemplazar `URL` por la URL pública del servidor (paso 1.3):

```bash
cd docs/lab6
k6 run -e BASE_URL=URL -e VUS=1 performance_test.js
```

En el resumen, revisar:
- `✓ status 200` y `✓ catalogo cargado` al 100 %.
- `errores` en `0.00%`.

Si `catalogo cargado` falla con 1 usuario, **no seguir**. Revisar que el puerto esté en *Public* y que la URL abra los lotes en el navegador.

### 2.3 Correr todos los niveles (~15–20 min)

```bash
./correr_niveles.sh URL
```

El script corre 1, 50, 100, 200, 500, 1000 y 2000 usuarios, 30 s cada uno, con 60 s de pausa entre niveles. Guarda cada resultado en `docs/lab6/resultados/`.

- Si en un nivel los errores ya son muy altos (más del 50 %), se puede cortar con `Ctrl+C`.
- Para afinar la rodilla con niveles intermedios: `./correr_niveles.sh URL 300 400`.

### 2.4 Bajar los resultados y apagar

1. En el explorador de archivos del Codespace: clic derecho sobre `docs/lab6/resultados` → **Download**.
2. Apagar los dos Codespaces: *github.com/codespaces → ⋯ → Stop codespace*.

---

## 3. Informe

### 3.1 Qué sacar de cada resultado

Del resumen de k6 (`resultados/vus-N.txt`):

| Métrica de k6 | Qué significa |
|---|---|
| `http_req_duration` → `avg` | Tiempo de respuesta promedio (el dato principal de la curva) |
| `http_req_duration` → `p(95)` | El 95 % de las peticiones tardó menos que esto |
| `errores` | % de peticiones que fallaron (código HTTP o catálogo sin cargar) |
| `http_reqs` → `/s` | Peticiones atendidas por segundo (throughput) |

### 3.2 Tabla de resultados

| Usuarios (VUs) | Tiempo promedio (ms) | p95 (ms) | Errores (%) | Peticiones/s |
|---:|---:|---:|---:|---:|
| 1 | | | | |
| 50 | | | | |
| 100 | | | | |
| 200 | | | | |
| 500 | | | | |
| 1000 | | | | |
| 2000 | | | | |

### 3.3 Gráfica

- Eje X: usuarios concurrentes.
- Eje Y: tiempo de respuesta promedio (ms).
- Opcional: una segunda serie o gráfica con el % de errores.

### 3.4 Identificar la rodilla

La rodilla es el punto donde la curva deja de subir suave y se dispara, o donde los errores pasan de 0 %. Según la guía, la rodilla está **por debajo** del primer nivel con errores mayores a 0 %.

Si el salto entre dos niveles queda muy grande (por ejemplo, todo bien en 200 y todo mal en 500), correr niveles intermedios (paso 2.3).

### 3.5 Condiciones de la prueba (incluir en el informe)

- Funcionalidad: listado del catálogo (`GET /`).
- Componentes: nginx, Pz_web_fe, Pz_api_ag, Pz_catalogo_cl, Pz_catalogo_db.
- Servidor: GitHub Codespace de 4 núcleos, con Docker Compose.
- Cliente: otro GitHub Codespace de 2 núcleos, con k6.
- Herramienta: k6, 30 s por nivel, 1 s de pausa entre peticiones de cada usuario.
- Limitación: el tráfico entra por el *port forwarding* público de GitHub, un proxy que también hace parte del camino medido.

---

## Plan B: portátiles + Tailscale

Si Codespaces falla, la misma prueba se puede hacer con Pujaz en el portátil de uno y k6 en el de otro:

1. Los dos instalan **Tailscale** (https://tailscale.com/download), que funciona como Hamachi: los pone en una misma red privada.
2. El servidor levanta Pujaz con `docker compose up -d --build` y comparte su equipo desde https://login.tailscale.com/admin/machines → **Share**.
3. El cliente instala k6 (`brew install k6` en macOS, `winget install k6 --source winget` en Windows) y corre los mismos pasos 2.2 y 2.3, con `BASE_URL=http://100.x.x.x:8080` (la IP de Tailscale del servidor).
4. En el informe se aclara que el internet de las dos casas hace parte de la medición.

---

## Tiempo estimado

| Paso | Tiempo |
|---|---|
| Crear el Codespace servidor y levantar Pujaz | ~10–15 min |
| Crear el Codespace cliente, instalar k6, prueba de humo | ~10 min |
| Correr los 7 niveles (con pausas) | ~15–20 min |
| Informe: tabla, gráfica y conclusión | 30–45 min |
| **Total** | **~1–1,5 h** |
