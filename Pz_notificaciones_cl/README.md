# Pz_notificaciones_cl — KAN-87

API interna FastAPI y consumidor asíncrono RabbitMQ → Redis.

## Contrato real

El productor Pz_subastas_cl publica en `eventos` (fanout, durable). Esta aplicación
usa su propia cola durable `pujaz.notificaciones`, sin competir con Postpuja.
Como fanout ignora las routing keys al distribuir, el consumidor filtra por
`PujaSuperada` y `SubastaCerrada`; confirma e ignora los demás eventos.

- PujaSuperada: `userId`, `auctionId`, `amount`.
- SubastaCerrada: `winnerId`, `auctionId`, `itemId`, `amount`.
- También admite `user_id` y `auction_id`. Cierres sin ganador no generan avisos.

Persiste con LPUSH en `notificaciones:{user_id}`. Cada aviso contiene user_id,
event, auction_id, message, data y received_at UTC. GET devuelve primero los nuevos.
ACK solo después de escribir; errores Redis generan NACK con reencolado y una pausa
para evitar un bucle intensivo. JSON inválido se rechaza sin reencolar. Reconexión
RabbitMQ automática y cancelación al apagar el proceso.

## Configuración

| Variable | Predeterminado |
|---|---|
| RABBITMQ_URL | amqp://guest:guest@pz-eventos-mq:5672/ |
| REDIS_HOST | pz-notificaciones-db |
| REDIS_PORT | 6379 |

`GET /notificaciones/{user_id}` devuelve un listado JSON (vacío si no hay avisos).
`GET /healthz` devuelve 200 cuando Redis responde y el consumidor está conectado;
503 si alguna dependencia no está disponible. Puerto interno 8000, sin puerto
publicado al host; redes backend y data. Redis tiene AOF y volumen nombrado en Compose.

## Construcción y pruebas

Desde la raíz:

```sh
docker build --target test -t pujaz-notificaciones-test services/Pz_notificaciones_cl
docker compose build pz-notificaciones-cl
docker compose up -d --wait pz-notificaciones-cl
docker compose logs -f pz-notificaciones-cl
```

Las pruebas unitarias usan dobles de Redis y mensajes RabbitMQ, sin datos reales.

## Límites de esta entrega

El endpoint es interno, no autentica usuarios. Una futura ruta en el Gateway debe
validar el JWT y limitar la consulta al usuario autenticado; no publicar esta API
directamente a Internet. No se modifica el Gateway en KAN-87.

Entrega al menos una vez: una caída entre LPUSH y ACK puede duplicar avisos. El
productor actual no incluye un identificador único de evento ni publica mensajes
persistentes; esta entrega no garantiza recuperación de eventos aún no consumidos
tras reiniciar el broker. No se implementan correo, push móvil ni retención automática.
Los mensajes inválidos se descartan, sin cola de errores en esta versión.

## Validación realizada

- 11 pruebas unitarias/API aprobadas en Python 3.11.
- Imagen runtime construida y Compose validado.
- RabbitMQ y Redis reales en proyecto Docker aislado: PujaSuperada y
  SubastaCerrada persistidos y consultados por REST para dos usuarios distintos.
- Usuario sin avisos devuelve []; JSON inválido rechazado y eventos ajenos ignorados.
- Healthz 200; recuperación tras reiniciar RabbitMQ/Redis y avisos conservados.
- Contenedores de prueba retirados; no se activó el consumidor en el proyecto real.
