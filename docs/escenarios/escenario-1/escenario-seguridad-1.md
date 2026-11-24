# Escenario de seguridad 1: captura de tráfico entre la app móvil y el API Gateway

## Contexto

La app móvil (`Pz_movil_fe`) se comunica con el API Gateway (`pz-api-ag`) a través del proxy de entrada (`pz-web-proxy`, Nginx). Hoy esa comunicación viaja **en texto plano**:

- consultas y mutaciones GraphQL por `http://<host>:8080/graphql`;
- suscripciones en tiempo real por `ws://<host>:8080/graphql`.

Por ese canal pasan datos sensibles: el correo y la contraseña en el login, el JWT que se envía en la cabecera `Authorization: Bearer` en cada petición, las pujas, las recargas de billetera y los datos personales del usuario.

## Escenario

| Elemento | Descripción |
|---|---|
| **Fuente** | Un atacante externo y no autenticado, conectado a la misma red que el usuario de la app móvil (por ejemplo, un Wi‑Fi público de un café o un aeropuerto). |
| **Estímulo** | El atacante captura de forma pasiva los paquetes que la app envía y recibe (*sniffing*, con herramientas como Wireshark o tcpdump). Su objetivo es obtener la contraseña del usuario o su JWT, para hacerse pasar por él (secuestro de sesión) y pujar o usar su saldo. |
| **Artefacto** | El canal de comunicación entre la app móvil (`Pz_movil_fe`) y el API Gateway (`pz-api-ag`), que entra por `pz-web-proxy`: peticiones HTTP a `/graphql` y suscripciones WebSocket. |
| **Ambiente** | El sistema en producción y en operación normal, con usuarios conectados desde redes no confiables. |
| **Respuesta** | El sistema solo acepta conexiones por un **canal seguro TLS**. Antes de enviar cualquier dato, la app y el servidor hacen el *handshake* TLS: el servidor presenta su certificado, la app lo valida y ambos acuerdan una clave de sesión. A partir de ahí todo el tráfico (HTTPS y WSS) va cifrado y con control de integridad, así que el atacante solo ve bytes ilegibles. Si el certificado no es válido, la app rechaza la conexión y no envía credenciales. |
| **Medida de la respuesta** | • El 100 % de las peticiones de la app al gateway viaja por TLS 1.2 o superior (`https://` y `wss://`). <br>• En una captura de tráfico hecha durante el login y una puja aparecen **0** contraseñas, tokens o montos legibles. <br>• El 100 % de las conexiones con un certificado inválido o autofirmado no confiable se rechaza. <br>• Ninguna petición en texto plano llega al gateway: el puerto HTTP redirige a HTTPS o queda cerrado. |

## Contramedida: Secure Channel Pattern con TLS

**Táctica:** resistir ataques → cifrar los datos en tránsito.
**Patrón:** Secure Channel. Se crea un canal autenticado y cifrado entre dos extremos antes de intercambiar información sensible.

### Elementos del patrón en Pujaz

| Elemento del patrón | En Pujaz |
|---|---|
| Cliente del canal | App móvil `Pz_movil_fe` |
| Servidor del canal | `pz-web-proxy` (Nginx), que termina TLS delante de `pz-api-ag` |
| Credencial del servidor | Certificado X.509 y su clave privada |
| Autoridad certificadora | Let's Encrypt en producción; mkcert (CA local) en el prototipo |
| Protocolo del canal | TLS 1.2/1.3: intercambio de llaves ECDHE y cifrado AES‑GCM |

### Flujo

```
App móvil ──(1) ClientHello──────────────────────────▶ pz-web-proxy
App móvil ◀─(2) Certificado + ServerHello────────────── pz-web-proxy
App móvil ──(3) valida el certificado y acuerda la clave de sesión
App móvil ══(4) HTTPS / WSS cifrado (login, JWT, pujas)══▶ pz-web-proxy ──HTTP red interna──▶ pz-api-ag
```

El canal seguro termina en el proxy de entrada. Del proxy al gateway el tráfico va por la red interna `backend`, que no está expuesta hacia afuera.

### Cambios para implementarlo

1. **Nginx (`docker/nginx/default.conf.template`):**
   - `listen 443 ssl;` con `ssl_certificate` y `ssl_certificate_key`;
   - `ssl_protocols TLSv1.2 TLSv1.3;`
   - un bloque `server` en el puerto 80 que solo responde `return 301 https://$host$request_uri;`
   - la cabecera `Strict-Transport-Security`.
2. **`docker-compose.yml`:** publicar el puerto 443 de `pz-web-proxy` y montar el certificado como volumen de solo lectura.
3. **App móvil (`lib/config/app_config.dart`):**
   - cambiar los valores por defecto a `https://<host>/graphql` y `wss://<host>/graphql`;
   - en Android, desactivar el tráfico en texto plano (`android:usesCleartextTraffic="false"`).
   - Mejora opcional: *certificate pinning*, para que la app solo acepte el certificado de Pujaz aunque el atacante instale una CA falsa en el dispositivo.

### Verificación

1. Capturar con Wireshark el tráfico del emulador mientras se hace login y una puja **antes** del cambio: la contraseña y el JWT aparecen legibles.
2. Repetir **después** del cambio: solo se ve el *handshake* TLS y datos cifrados (*Application Data*).
3. Intentar conectarse por `http://` y comprobar que no se atiende la petición.
4. Probar con un certificado no confiable y comprobar que la app rechaza la conexión.
