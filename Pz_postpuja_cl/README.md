# Pz_postpuja_cl · Entregas de las piezas ganadas

Componente de lógica de la entrega 2 (Python, FastAPI) con su propia base MongoDB (`pz-postpuja-db`).
Se encarga de lo que pasa después de ganar una subasta: la entrega de la pieza.

- **Recibe** el evento `SubastaCerrada` de `Pz_eventos_mq` (RabbitMQ, publicar-suscribir) y crea la
  entrega en estado `PENDING` para el ganador. Si la subasta cerró sin pujas, no crea nada.
- **Expone** una API REST que solo usa el gateway: consultar las entregas de un usuario y confirmar
  una entrega (`CONFIRMED`).

Estructura igual a la del catálogo: `src/api` (rutas HTTP), `src/core` (reglas),
`src/infrastructure` (MongoDB y RabbitMQ) y `src/models`.

## Evento SubastaCerrada

Lo publica Pz_subastas_cl al cerrar una subasta vencida.

- Exchange `eventos` (tipo `fanout`, durable), el mismo que usan Pz_subastas_cl y Pz_billetera_cl.
  La routing key es el nombre del evento; como el fanout le entrega todo a todos, Postpuja solo
  procesa los mensajes con routing key `SubastaCerrada` y confirma e ignora los demás.
- Cola propia y durable: `postpuja_eventos`.
- Cuerpo JSON:

```json
{ "auctionId": "12", "itemId": "60d5ec49f1b2c3d4e5f60001", "winnerId": 7, "amount": 150000.0 }
```

`winnerId` va en `null` si no hubo pujas (entonces no se crea entrega). Si llega `closedAt`, se usa
como fecha de la entrega; si no, la hora en que llega el evento. Los nombres se cambian con las
variables `EVENTOS_EXCHANGE`, `EVENTO_SUBASTA_CERRADA` y `POSTPUJA_COLA`.

Tácticas: **consumidor idempotente** (índice único por `auctionId`: un evento repetido no crea dos
entregas), **cola durable** (si Postpuja está caído, los eventos esperan) y **reintento** (si falla la
base, el mensaje vuelve a la cola; si está mal formado, se descarta).

## API REST

| Método y ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /health` | Salud (llega a su MongoDB) | 200, 503 |
| `GET /deliveries?winnerId=7` | Entregas del usuario, de la más reciente a la más antigua | 200 `[Entrega]` |
| `POST /deliveries/{id}/confirm` con `{"winnerId": "7"}` | El ganador confirma que recibió la pieza | 200 `Entrega`, 404 `NOT_FOUND` (no existe o no es suya), 400 `BAD_USER_INPUT` (ya confirmada) |

```json
{ "id": "6726...", "auctionId": "a1", "itemId": "64f1...", "winnerId": "7", "amount": 150000.0,
  "status": "PENDING", "createdAt": "2026-11-02T20:00:00Z", "confirmedAt": null }
```

Los errores usan el formato del contrato REST: `{"code": "NOT_FOUND", "message": "..."}`.

## Variables

| Variable | Por defecto | Uso |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | Base propia (`pujaz_postpuja`, colección `entregas`) |
| `RABBITMQ_URL` | vacío | Si está vacío, no escucha eventos y solo atiende la API REST |

## Pruebas

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest
```

Usan mongomock (MongoDB en memoria) y mensajes simulados, así que no necesitan MongoDB ni RabbitMQ.
