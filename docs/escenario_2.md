# Escenario 2: proxy inverso para la app móvil

| Parte | Contenido |
| --- | --- |
| **Fuente** | Atacante externo |
| **Estímulo** | Usa la entrada móvil para llegar a las páginas web, a un microservicio o para descubrir qué tecnologías usa el sistema |
| **Artefacto** | Puerta de entrada móvil (`pz-movil-rp`) |
| **Entorno** | Operación normal, despliegue con docker-compose |
| **Respuesta** | El proxy solo deja pasar `/graphql` y las fotos; lo demás responde 404 y no muestra versiones ni tecnologías |
| **Medida de la respuesta** | 0 rutas internas alcanzables desde la entrada móvil, salvo las dos permitidas; ninguna cabecera revela tecnología interna |

**Táctica:** limitar la exposición.
**Patrón:** Reverse Proxy.

### Evidencia

**Ruta bloqueada (404 Not Found):**
```bash
curl -i http://localhost:8081/
HTTP/1.1 404 Not Found
Server: nginx
Date: Sat, 21 Nov 2026 03:01:31 GMT
Content-Type: text/html
Content-Length: 146
Connection: keep-alive
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin

<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>
```

**Ruta permitida:**
```bash
curl -i http://localhost:8081/healthz
HTTP/1.1 200 OK
Server: nginx
Date: Sat, 21 Nov 2026 03:01:27 GMT
Content-Type: text/plain
Content-Length: 2
Connection: keep-alive
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin

ok
```