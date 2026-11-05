# Contrato de API · Pujaz · Parte de eventos (microservicios <-> Pz_eventos_mq)

Complementa a `rest.md` (Gateway -> microservicios) y a `schema.graphql` (front-ends <-> Gateway). Aquí se define qué eventos viajan por RabbitMQ (`pz-eventos-mq`), quién los publica, quién los consume y qué campos lleva cada mensaje.

## 0. Reglas generales

- **Exchange:** uno solo, `eventos`, tipo `fanout`, durable. Todos los servicios lo declaran exactamente así; si alguien lo declara con otro tipo, RabbitMQ cierra el canal con `PRECONDITION_FAILED`.
- **Routing key:** el nombre del evento en PascalCase (`PujaSuperada`). Como el exchange es `fanout`, la routing key no decide a qué cola llega el mensaje (llega a todas), pero viaja con él: cada consumidor la lee para saber qué evento recibió.
- **Consumidores:** cada servicio tiene **una cola propia y durable** enlazada a `eventos`. Lee `routing_key`, procesa los eventos que le interesan y hace `ack` sin hacer nada con los demás.
- **Cuerpo:** JSON (`content_type: application/json`), mensaje persistente (`delivery_mode: 2`).
- **Tipos:** ids como texto (`"12"`), igual que en `rest.md`. Montos como número JSON (`150000.00`). Fechas ISO-8601 UTC (`2026-11-02T20:00:00Z`). Un campo sin valor va en `null`, no se omite.
- **Campos comunes:** todos los eventos llevan `eventId` (UUID, distinto en cada publicación) y `occurredAt` (cuándo pasó).
- **Cuándo se publica:** **después** del `COMMIT` en la base de datos del servicio. Nunca se publica algo que después puede deshacerse.
- **Entrega al menos una vez:** el mismo evento puede llegar dos veces (reinicio, `nack`). Cada consumidor es idempotente; abajo se indica con qué campo.
- **Errores al consumir:** mensaje mal formado → `reject` sin reencolar (se descarta y se registra en el log). Falla temporal (base caída) → `nack` con reencolado.

### Colas

| Servicio | Cola | Tipo | Eventos que procesa |
|---|---|---|---|
| Pz_billetera_cl | `billetera_eventos` | durable | `UsuarioRegistrado`, `PujaSuperada`, `SubastaCerrada` |
| Pz_postpuja_cl | `postpuja.eventos` | durable | `SubastaCerrada` |
| Pz_notificaciones_cl | `pujaz.notificaciones` | durable | `UsuarioRegistrado`, `PujaSuperada`, `SubastaCerrada` |
| Pz_api_ag | sin nombre (la genera RabbitMQ) | exclusiva y `auto-delete`, una por copia del Gateway | `PrecioActualizado` |

El Gateway usa una cola por copia porque **cada** copia tiene que enterarse de cada precio para avisar a sus propios WebSocket. Si compartieran cola, cada mensaje le llegaría a una sola copia.

### Resumen

| Evento | Publica | Consumen |
|---|---|---|
| `UsuarioRegistrado` | Pz_usuarios_cl | Pz_billetera_cl, Pz_notificaciones_cl |
| `PujaSuperada` | Pz_subastas_cl | Pz_billetera_cl, Pz_notificaciones_cl |
| `PrecioActualizado` | Pz_subastas_cl | Pz_api_ag |
| `SubastaCerrada` | Pz_subastas_cl | Pz_billetera_cl, Pz_postpuja_cl, Pz_notificaciones_cl |

---

## 1. `UsuarioRegistrado`

**Publica** Pz_usuarios_cl cuando se crea un usuario (`POST /users` respondió 201).

```json
{
  "eventId": "1c9f3a52-6a0e-4c43-9a51-0d7f0b0f6a11",
  "occurredAt": "2026-11-02T14:00:00Z",
  "userId": "7",
  "name": "Ana",
  "email": "ana@correo.com",
  "role": "comprador"
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `userId` | string | Id del usuario en Pz_usuarios_cl |
| `name` | string | |
| `email` | string | |
| `role` | string | El mismo valor que guarda Pz_usuarios_cl, en minúsculas (`comprador` por defecto) |

**Consumen:**
- **Pz_billetera_cl:** crea la billetera del usuario con saldo 0. Idempotente por `userId`: si ya existe, no hace nada.
- **Pz_notificaciones_cl:** crea la notificación `WELCOME`.

## 2. `PujaSuperada`

**Publica** Pz_subastas_cl cuando guarda una puja que deja atrás al ganador anterior. **Solo si el ganador anterior es otra persona.** Si el mismo usuario sube su propia puja, no se publica: el Gateway libera la reserva anterior con la respuesta de `POST /auctions/{auctionId}/bids` (ver `rest.md`, §3.4).

```json
{
  "eventId": "6b1f0f0e-3d1b-4f3a-9a2e-2a4c1d9e7b20",
  "occurredAt": "2026-11-02T14:10:00Z",
  "auctionId": "12",
  "itemId": "64f1c0aa9b1e8a0012ab34cd",
  "userId": "9",
  "reservationId": "301",
  "amount": 120000.00,
  "newAmount": 130000.00
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `auctionId` | string | |
| `itemId` | string | |
| `userId` | string | El postor **superado** (quien pierde el primer lugar) |
| `reservationId` | string | La reserva del postor superado, la que hay que liberar |
| `amount` | number | Monto de la puja superada (lo que se le devuelve) |
| `newAmount` | number | Monto de la puja nueva |

**Consumen:**
- **Pz_billetera_cl:** libera `reservationId` (pasa de `reserved` a `available`, movimiento `REFUND`). Idempotente por `reservationId`: si la reserva ya estaba liberada, no hace nada.
- **Pz_notificaciones_cl:** crea la notificación `OUTBID` para `userId`.

## 3. `PrecioActualizado`

**Publica** Pz_subastas_cl cada vez que guarda una puja (haya o no ganador anterior).

```json
{
  "eventId": "8a4d2c71-0b5e-4f8e-b1c2-7e3f9d0a5c33",
  "occurredAt": "2026-11-02T14:10:00Z",
  "auctionId": "12",
  "currentPrice": 130000.00,
  "bidId": "56",
  "bidderId": "7"
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `auctionId` | string | |
| `currentPrice` | number | Precio después de la puja |
| `bidId` | string | La puja que movió el precio |
| `bidderId` | string | Quien hizo esa puja |

**Consume:**
- **Pz_api_ag:** vuelve a leer la subasta (`GET /auctions/{auctionId}`) y su ítem, y la envía a los suscriptores de `auctionUpdated(auctionId)`. Si dos eventos llegan desordenados, la lectura devuelve el estado más reciente, así que no hace falta ordenarlos.

## 4. `SubastaCerrada`

**Publica** Pz_subastas_cl por cada subasta que cierra al atender `POST /auctions/close-expired`. Ese endpoint lo llama Pz_cierre_cl cada cierto tiempo; Pz_cierre_cl no publica eventos.

```json
{
  "eventId": "f2e8c9a0-5b7d-4e1c-8f3a-1d2b4c6e8a44",
  "occurredAt": "2026-11-02T20:00:00Z",
  "auctionId": "12",
  "itemId": "64f1c0aa9b1e8a0012ab34cd",
  "winnerId": "7",
  "amount": 130000.00,
  "reservationId": "305",
  "participantIds": ["7", "9"],
  "closedAt": "2026-11-02T20:00:00Z"
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `auctionId` | string | |
| `itemId` | string | |
| `winnerId` | string \| null | `null` si nadie pujó |
| `amount` | number \| null | Precio final; `null` si nadie pujó |
| `reservationId` | string \| null | Reserva del ganador, la que se cobra; `null` si nadie pujó |
| `participantIds` | string[] | Todos los que pujaron, incluido el ganador; `[]` si nadie pujó |
| `closedAt` | string (fecha) | Cuándo quedó cerrada |

**Consumen:**
- **Pz_billetera_cl:** cobra la reserva del ganador (sale de `reserved`, movimiento `CHARGE`). Idempotente por `reservationId`. Sin ganador no hace nada.
- **Pz_postpuja_cl:** crea la entrega `PENDING` para el ganador. Idempotente por `auctionId` (índice único). Sin ganador no hace nada.
- **Pz_notificaciones_cl:** `AUCTION_WON` para `winnerId` y `AUCTION_LOST` para cada id de `participantIds` distinto de `winnerId`.

---

## 5. Qué ajusta cada servicio

Diferencias entre este contrato y el código de `developcito` y de las ramas de trabajo al momento de escribirlo.

| Servicio | Ajuste |
|---|---|
| Pz_subastas_cl | Publicar **después** del `COMMIT` de la puja (hoy `PujaSuperada` y `PrecioActualizado` salen antes de `CreateBid`). Ids como texto en todos los eventos. Agregar `eventId`, `occurredAt` y los campos nuevos (`itemId`, `reservationId`, `newAmount`, `bidId`, `bidderId`, `participantIds`, `closedAt`). Renombrar `price` → `currentPrice` en `PrecioActualizado`. No publicar `PujaSuperada` si el ganador anterior es el mismo postor. |
| Pz_billetera_cl | Leer ids como texto. Liberar y cobrar por `reservationId` (idempotente) en vez de por monto. Consumir `UsuarioRegistrado` para crear la billetera. |
| Pz_postpuja_cl | Declarar `eventos` como `fanout` (hoy `pujaz.eventos`, `topic`), cola `postpuja.eventos`, y procesar solo `routing_key == "SubastaCerrada"`. Con variables de entorno no alcanza, porque el tipo de exchange está fijo en el código. |
| Pz_usuarios_cl | Publicar solo en `eventos` (quitar `pujaz.exchange` y su cola). `userId` como texto. Agregar `eventId` y `occurredAt` (hoy envía `timestamp`). |
| Pz_notificaciones_cl | Consumir `UsuarioRegistrado` (`WELCOME`). Generar `AUCTION_LOST` con `participantIds`. Tomar el destinatario de `PujaSuperada` de `userId` y el de `SubastaCerrada` de `winnerId`. |
| Pz_api_ag | Consumir `PrecioActualizado` con una cola exclusiva en vez del pubsub en memoria (KAN-79). |
