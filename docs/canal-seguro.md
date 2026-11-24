# Canal seguro cliente–WAF · Pujaz

## Alcance y decisión

El canal cifrado comienza en el navegador o la aplicación móvil y termina en `pz-waf-fw`. El WAF presenta el certificado de servidor y negocia TLS 1.2 o TLS 1.3. HTTPS transporta las peticiones y WSS las suscripciones GraphQL. Después de terminar TLS, el WAF aplica sus reglas existentes y reenvía por HTTP/WS interno hacia los proxies.

```text
Navegador -- HTTPS/WSS :8080 --\
                               pz-waf-fw -- HTTP/WS :80 --> proxy web/móvil --> Gateway
App móvil -- HTTPS/WSS :8081 --/
             CANAL CIFRADO       TERMINACIÓN TLS            RED INTERNA
```

Se conservan los puertos publicados actuales, configurables mediante `NGINX_PORT` y `NGINX_MOVIL_PORT`. No es obligatorio usar 443 para HTTPS. En estos puertos ya no se atiende HTTP en claro: se rechaza, sin reenviar la solicitud a la aplicación. Los clientes deben usar directamente HTTPS/WSS; no se confía en una redirección para proteger credenciales enviadas inicialmente por HTTP.

El cambio no agrega mTLS, cifrado entre microservicios, TLS para bases de datos ni reglas nuevas de inspección WAF. El canal autentica al servidor mediante certificado; la identidad del usuario continúa usando los mecanismos existentes de Pujaz.

## Escenario de calidad en seis partes

**Atributo:** seguridad, con confidencialidad e integridad de la comunicación y autenticación del servidor.

| Parte | Especificación |
| --- | --- |
| 1. Fuente del estímulo | Usuario legítimo desde navegador o app móvil; potencial atacante situado en la red entre cliente y WAF. |
| 2. Estímulo | El cliente envía una operación GraphQL o abre una suscripción; un atacante intenta observar o modificar el tráfico, suplantar al servidor o utilizar transporte sin cifrar. |
| 3. Entorno | Operación normal del despliegue Docker, a través de una red externa no confiable. El cliente dispone de una CA confiable y usa un nombre o IP incluido en el certificado vigente. |
| 4. Artefacto | Conexiones cliente–`pz-waf-fw` en las entradas web y móvil, certificado y clave del WAF, configuración TLS y transporte de `/graphql`. |
| 5. Respuesta | Se negocia TLS 1.2/1.3, el cliente verifica cadena, vigencia y nombre del servidor y se transportan HTTPS/WSS cifrados. Una CA desconocida o nombre incorrecto causa rechazo del cliente; TLS antiguo y HTTP en claro son rechazados. El WAF descifra y continúa por la red interna, conservando el esquema original en las cabeceras de proxy. |
| 6. Medida de respuesta | En ambas entradas: TLS 1.2 y 1.3 aceptados; TLS 1.0/1.1 rechazados; cero solicitudes HTTP de prueba alcanzan el upstream; certificados no confiables o con nombre incorrecto rechazados; HTTPS devuelve 200 desde el upstream de prueba; WSS devuelve 101 y transmite `connection_init`/`connection_ack`. La inspección debe confirmar que solo el WAF publica puertos. |

Estas medidas son criterios verificables del transporte, no una afirmación de invulnerabilidad ni una prueba completa del negocio.

## Táctica y patrón

**Táctica principal: cifrar los datos en tránsito.** TLS protege la confidencialidad e integridad del tramo externo. La verificación de la cadena de confianza y del SAN autentica al servidor y evita aceptar cualquier certificado solo por estar cifrado. Se restringen versiones a TLS 1.2/1.3 y se impide servir la aplicación por HTTP en las entradas públicas.

**Patrón: Secure Channel, realizado mediante terminación TLS en el proxy inverso perimetral (TLS Termination).** El WAF centraliza certificados y negociación criptográfica, y los servicios internos conservan sus protocolos existentes. El límite de confianza está explícito: la protección TLS termina en el WAF y no es cifrado extremo a extremo hasta la base de datos.

## Archivos y configuración

- `Pz_waf_fw/nginx.conf`: listeners TLS, certificados externos, protocolos y salud interna en `127.0.0.1:8090` (sin publicación).
- `docker-compose.yml`: certificado y clave montados individualmente en solo lectura; no monta la clave de la CA. CORS predeterminado para `https://localhost:8080`.
- `docker/nginx/*.template`: conserva `X-Forwarded-Proto: https` recibido del WAF. El WAF reemplaza la cabecera enviada por el cliente con su propio `$scheme`.
- `Pz_movil_fe/lib/config/app_config.dart`: valores predeterminados HTTPS/WSS para el emulador Android.
- `.gitignore` y `Pz_waf_fw/.dockerignore`: excluyen `Pz_waf_fw/certs/` de Git y del contexto de construcción. Las claves no se incorporan a imágenes.
- `.github/workflows/ci.yml`: el job del WAF genera certificados efímeros y ejecuta las pruebas aisladas del canal.

## Certificados de desarrollo

Requisitos: Python 3, OpenSSL y Docker Compose. En Windows el generador también detecta OpenSSL instalado con Git.

Desde la raíz del repositorio:

```powershell
python Pz_waf_fw/generate_certificates.py
```

Genera una CA de desarrollo de 365 días y un certificado de servidor de 90 días. SAN incluidos: `localhost`, `127.0.0.1`, `::1` y `10.0.2.2`. Para un teléfono físico, agrega la IP LAN o DNS con `--san` al generar un conjunto nuevo. El comando se niega a sobrescribir un destino no vacío.

```powershell
python Pz_waf_fw/generate_certificates.py --output Pz_waf_fw/certs/renovacion --san 192.168.1.50
```

Configura `WAF_TLS_DIR=./Pz_waf_fw/certs/renovacion` para usar ese conjunto. Cada ejecución crea una CA diferente; los clientes deben confiar en la correspondiente. La clave `ca.key` es material privado del emisor local y nunca se distribuye a clientes ni al WAF. Restringe también los permisos NTFS de la carpeta de claves en Windows; `chmod` no sustituye una ACL de Windows.

### Confianza en los clientes

El generador no modifica el almacén de confianza del sistema. La CA local sirve solo para desarrollo. En Windows, para confiar explícitamente en ella en el usuario actual:

```powershell
Import-Certificate -FilePath .\Pz_waf_fw\certs\ca.crt -CertStoreLocation Cert:\CurrentUser\Root
```

Este comando amplía la confianza del usuario a los certificados emitidos por esa CA: úsalo únicamente para tu CA local y conserva su clave privada protegida. Guarda el thumbprint devuelto para poder retirar exactamente esa CA al finalizar las pruebas. Algunos navegadores usan su propio almacén y requieren importar allí la CA.

En móvil, configura `PUJAZ_GRAPHQL_HTTP=https://10.0.2.2:8081/graphql` y `PUJAZ_GRAPHQL_WS=wss://10.0.2.2:8081/graphql` para el emulador; en dispositivo físico usa el host incluido en el SAN. El cliente Flutter debe confiar en la CA a través de un mecanismo compatible con la plataforma/runtime. La instalación de una CA de usuario no implica que toda app Android la acepte. Si el dispositivo no admite esta CA para la app, usa un dominio y certificado de una CA pública confiable. No usar `badCertificateCallback`, validadores que acepten todo ni excepciones de certificado como solución.

Para producción se requiere un dominio y certificado de CA confiable, con renovación operativa. Proporciona `server.crt` con la cadena del servidor (certificado hoja seguido de intermediarios) y `server.key` correspondiente mediante `WAF_TLS_DIR`. No utilices la CA local para usuarios reales.

## Activación y renovación

Configura en tu `.env` el origen real de la web, por ejemplo `CORS_ORIGIN=https://localhost:8080`. Las URLs internas de microservicios permanecen con HTTP. El navegador web deriva WSS de la página HTTPS; no dejes un override `NEXT_PUBLIC_GATEWAY_WS_URL` con `ws://`.

Con las dependencias de Pujaz ya ejecutándose, aplica exclusivamente los componentes del canal:

```powershell
docker compose config --quiet
docker compose up -d --no-deps --build pz-waf-fw pz-web-rp pz-movil-rp
docker compose exec pz-waf-fw nginx -t
curl.exe --cacert Pz_waf_fw/certs/ca.crt https://localhost:8080/healthz
curl.exe --cacert Pz_waf_fw/certs/ca.crt https://localhost:8081/healthz
```

Si el Gateway estaba ejecutándose con un `CORS_ORIGIN` HTTP, debe recrearse para cargar el origen HTTPS. Esta actualización de entorno no modifica su lógica. En una instalación apagada deben arrancarse antes las dependencias de la aplicación; el procedimiento aislado de abajo permite verificar TLS sin iniciar las bases ni el negocio.

Tras renovar, verifica cadena, fechas y SAN, actualiza los archivos montados y recrea el WAF para que los bind mounts recojan correctamente los archivos nuevos. No publiques ni copies claves en Git, imágenes, logs o artefactos CI. No hay renovación automática configurada.

## Pruebas reproducibles del canal

Se prueban el WAF y ambos proxies reales contra un upstream HTTP/WS controlado. Este upstream simula únicamente el intercambio necesario para verificar el transporte, sin ejecutar resolvers ni lógica de negocio.

```powershell
docker compose -p pujaz-tls-test -f Pz_waf_fw/tests/compose.tls.yml up -d --build --wait
docker compose -p pujaz-tls-test -f Pz_waf_fw/tests/compose.tls.yml exec -T waf nginx -t
docker compose -p pujaz-tls-test -f Pz_waf_fw/tests/compose.tls.yml run --rm test
docker compose -p pujaz-tls-test -f Pz_waf_fw/tests/compose.tls.yml down
```

El cliente de prueba confía explícitamente en `ca.crt`, verifica el nombre `localhost` y no usa modos inseguros. Además verifica el paso de Authorization y la conservación de HTTPS incluso si el cliente envía un `X-Forwarded-Proto: http` falso. El entorno solo publica `127.0.0.1:18080/18081` para diagnóstico y no utiliza bases ni volúmenes de Pujaz.

**Resultado local:** las seis pruebas automatizadas pasaron en ambas entradas. `nginx -t` y `docker compose config --quiet` finalizaron correctamente. Se comprobó transporte WSS con respuesta 101 y mensajes de inicialización/confirmación contra el upstream controlado; no se ejecutó una subasta real ni se desplegó el sistema completo.

Se puede ejecutar `python Pz_waf_fw/tests/test_tls.py` desde el host usando esos puertos. Durante la validación local del 23 de noviembre de 2026, Avast sustituyó el certificado por uno de `Avast Web/Mail Shield Untrusted Root`; el cliente del host lo rechazó. La prueba desde Docker evita esa intermediación y mantiene la validación estricta. No se desactivó Avast ni se omitió la verificación del certificado. La confianza y el recorrido real en cada navegador/móvil deben comprobarse antes de dar por validado ese dispositivo.

Referencia técnica: [configuración HTTPS de Nginx](https://nginx.org/en/docs/http/configuring_https_servers.html).
