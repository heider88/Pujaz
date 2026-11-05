# Contrato de API · Pujaz · Parte REST (Gateway -> microservicios)

Versión 3 (entrega 2). Complementa a `schema.graphql` (front-ends <-> Gateway) y a `eventos.md` (eventos en `Pz_eventos_mq`). Aquí se define lo que el **Gateway** le pide a cada microservicio. Los nombres de errores son exactamente los del schema.

Cambios de la v3:
- El "MS transaccional" de la entrega 1 se separa en **Pz_usuarios_cl**, **Pz_billetera_cl** y **Pz_subastas_cl**, cada uno con su base.
- Nuevos: **Pz_postpuja_cl** (entregas) y **Pz_notificaciones_cl** (notificaciones).
- `placeBid` es una **Saga** que coordina el Gateway: reserva en billetera, puja en subastas y compensa si la puja falla (§3.4 y §7).
- `auctionUpdated` sale del evento `PrecioActualizado` (ver `eventos.md`), no de la respuesta de `placeBid`.

## 0. Reglas generales

- **Quién llama a quién:** el Gateway llama a todos los microservicios. La única llamada entre microservicios es la de Pz_cierre_cl a `POST /auctions/close-expired`. Lo demás entre ellos va por eventos (`eventos.md`). Los microservicios no se publican fuera de la red `backend` de Docker Compose; el navegador nunca los ve.
- **Autenticación:** el Gateway valida el JWT y saca el `userId` del token. A los microservicios les pasa ese `userId` en la ruta o en el cuerpo. Los microservicios no validan JWT (confían en la red interna).
- **Formato:** JSON (`Content-Type: application/json`). Fechas en ISO-8601 UTC (`2026-10-12T15:00:00Z`). Montos como número JSON (`150000.00`).
- **Ids:** texto (`string`) en todas las respuestas y cuerpos, aunque la base los guarde como número.
- **Contraseñas:** el Gateway envía la contraseña en texto plano a Pz_usuarios_cl por la red interna; Pz_usuarios_cl guarda solo el hash. Nunca se devuelve.

### Direcciones (Docker Compose)

| Servicio | URL interna | Variable en el Gateway |
|---|---|---|
| Pz_usuarios_cl | `http://pz-usuarios-cl:8080` | `MS_USUARIOS_URL` |
| Pz_subastas_cl | `http://pz-subastas-cl:8081` | `MS_SUBASTAS_URL` |
| Pz_billetera_cl | `http://pz-billetera-cl:8082` | `MS_BILLETERA_URL` |
| Pz_catalogo_cl | `http://pz-catalogo-cl:8000` | `MS_CATALOGO_URL` |
| Pz_postpuja_cl | `http://pz-postpuja-cl:8000` | `MS_POSTPUJA_URL` |
| Pz_notificaciones_cl | `http://pz-notificaciones-cl:8000` | `MS_NOTIFICACIONES_URL` |

### Formato de error (todos los endpoints de todos los servicios)

```json
{ "code": "BID_TOO_LOW", "message": "La puja debe superar el precio actual (120000.00)" }
```

`code` es uno de: `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `BAD_USER_INPUT`, `NOT_FOUND`, `BID_TOO_LOW`, `AUCTION_CLOSED`, `INSUFFICIENT_FUNDS`, `INTERNAL`. No se usan otros códigos (por ejemplo, nada de `USER_ALREADY_EXISTS` ni `USER_NOT_FOUND`), y `code` va en su propio campo, no pegado al texto del mensaje. El Gateway copia `code` tal cual a `errors[].extensions.code` de GraphQL. `UNAUTHENTICATED` lo genera solo el Gateway.

| HTTP | Cuándo |
|---|---|
| 400 | `BAD_USER_INPUT` |
| 401 | `INVALID_CREDENTIALS` |
| 404 | `NOT_FOUND` |
| 409 | `EMAIL_TAKEN`, `BID_TOO_LOW`, `AUCTION_CLOSED` |
| 422 | `INSUFFICIENT_FUNDS` |
| 500 | `INTERNAL` |

Todos los servicios exponen además `GET /health` (200 si llegan a su base, 503 si no). El Gateway no lo usa; es para Docker Compose.

---

## 1. Pz_usuarios_cl (PostgreSQL `pz-usuarios-db`)

Dueño de: usuarios, contraseñas y roles. Publica `UsuarioRegistrado`.

### Objetos que devuelve

```json
// User
{ "id": "7", "name": "Ana", "email": "ana@correo.com", "role": "comprador", "status": "activa", "createdAt": "2026-10-09T14:00:00Z" }
```

- `role` va en minúsculas; si el registro no lo trae, es `comprador`.
- `status` es `activa` o `inactiva`. Un usuario `inactiva` no puede iniciar sesión.

**POST `/users`** — registrar usuario. Después del `COMMIT` publica `UsuarioRegistrado`; con ese evento Pz_billetera_cl crea la billetera en 0.

```json
// Request
{ "name": "Ana", "email": "ana@correo.com", "password": "Secreto123!", "role": "comprador" }
// 201: objeto User
```
Errores: 409 `EMAIL_TAKEN`, 400 `BAD_USER_INPUT` (campo vacío, correo inválido, contraseña que no cumple la regla del proyecto).

**POST `/users/verify-credentials`** — comprobar login. El Gateway firma el JWT si responde 200.

```json
// Request
{ "email": "ana@correo.com", "password": "Secreto123!" }
// 200: objeto User
```
Errores: 401 `INVALID_CREDENTIALS` (correo no existe, contraseña incorrecta o usuario `inactiva`; el mismo mensaje en los tres casos).

**GET `/users/{userId}`** — usuario por id (`me`).
- 200: objeto `User`. Errores: 404 `NOT_FOUND`.

**PATCH `/users/{userId}`** — actualizar. Solo se envían los campos que cambian: `name`, `email`, `password`.

```json
// Request
{ "name": "Ana María" }
// 200: objeto User actualizado
```
Errores: 404 `NOT_FOUND`, 409 `EMAIL_TAKEN`, 400 `BAD_USER_INPUT` (mismas reglas que en `POST /users` para los campos que se envíen).

**DELETE `/users/{userId}`** — borrar usuario.
- 204 sin cuerpo. Errores: 404 `NOT_FOUND`.
- Las pujas y movimientos están en otras bases y no se tocan.

---

## 2. Pz_billetera_cl (PostgreSQL `pz-billetera-db`)

Dueño de: billeteras, reservas y movimientos. Consume `UsuarioRegistrado`, `PujaSuperada` y `SubastaCerrada`.

### Objetos que devuelve

```json
// Wallet
{
  "userId": "7",
  "available": 380000.00,
  "reserved": 120000.00,
  "movements": [
    { "id": "301", "type": "RESERVE", "amount": 120000.00, "auctionId": "12", "createdAt": "2026-10-09T14:05:00Z" },
    { "id": "300", "type": "DEPOSIT", "amount": 500000.00, "auctionId": null, "createdAt": "2026-10-09T13:50:00Z" }
  ]
}

// Reservation
{ "id": "301", "userId": "7", "auctionId": "12", "amount": 120000.00, "status": "ACTIVE", "createdAt": "2026-10-09T14:05:00Z" }
```

- `movements[].type` es `DEPOSIT`, `RESERVE`, `REFUND` o `CHARGE`. Orden: del más reciente al más antiguo.
- `Reservation.status` es `ACTIVE` (el monto está en `reserved`), `RELEASED` (volvió a `available`) o `CHARGED` (se cobró al cerrar la subasta).

**GET `/users/{userId}/wallet`**
- 200: objeto `Wallet`. Errores: 404 `NOT_FOUND`.

**POST `/users/{userId}/wallet/deposits`** — recargar.

```json
// Request
{ "amount": 500000.00, "promoCode": "PROMO2026" }
// 200: objeto Wallet (ya con el depósito)
```
Errores: 400 `BAD_USER_INPUT` (`amount` <= 0, o `promoCode` distinto de `PROMO2026`), 404 `NOT_FOUND`.

**POST `/users/{userId}/wallet/reservations`** — paso 1 de la Saga de la puja: aparta el monto (de `available` a `reserved`, movimiento `RESERVE`).

```json
// Request
{ "auctionId": "12", "amount": 130000.00 }
// 201
{ "reservation": { "id": "305", "userId": "7", "auctionId": "12", "amount": 130000.00, "status": "ACTIVE", "createdAt": "2026-10-09T14:10:00Z" },
  "wallet": { "userId": "7", "available": 250000.00, "reserved": 250000.00, "movements": [] } }
```
Errores: 422 `INSUFFICIENT_FUNDS` (`available` < `amount`), 400 `BAD_USER_INPUT` (`amount` <= 0), 404 `NOT_FOUND`.

**POST `/users/{userId}/wallet/reservations/{reservationId}/release`** — compensación: devuelve el monto de `reserved` a `available` (movimiento `REFUND`).
- 200: objeto `Reservation` con `status: RELEASED`.
- **Idempotente:** si ya estaba `RELEASED`, responde 200 igual y no crea otro movimiento. Si está `CHARGED`, no la toca y responde 200 con su estado actual.
- Errores: 404 `NOT_FOUND` (no existe o no es de ese usuario).

El cobro al ganador **no tiene endpoint**: lo hace la billetera al recibir `SubastaCerrada` (`eventos.md`, §4).

---

## 3. Pz_subastas_cl (PostgreSQL `pz-subastas-db`)

Dueño de: subastas y pujas. No guarda saldos ni llama a la billetera. Publica `PujaSuperada`, `PrecioActualizado` y `SubastaCerrada`.

### Objetos que devuelve

```json
// Auction
{
  "id": "12",
  "itemId": "64f1c0aa9b1e8a0012ab34cd",
  "basePrice": 100000.00,
  "currentPrice": 120000.00,
  "winningBid": { "id": "55", "amount": 120000.00, "bidder": { "id": "7", "name": "Ana" }, "createdAt": "2026-10-09T14:05:00Z" },
  "participants": [ { "id": "7", "name": "Ana" }, { "id": "9", "name": "Luis" } ],
  "endsAt": "2026-10-12T15:00:00Z",
  "status": "OPEN"
}
```

- `winningBid` es `null` si no hay pujas; entonces `currentPrice` = `basePrice`.
- `status` es `OPEN` o `CLOSED`. Una subasta con `endsAt` vencido se muestra `CLOSED` aunque Pz_cierre_cl todavía no la haya cerrado.
- `bidder` y `participants` llevan solo `id` y `name` (sin correo). Subastas guarda el `name` del postor que le manda el Gateway al pujar.

### 3.1 Crear y leer

**POST `/auctions`** — crear la subasta de un ítem (el Gateway la llama justo después de crear el ítem en Pz_catalogo_cl).

```json
// Request
{ "itemId": "64f1c0aa9b1e8a0012ab34cd", "basePrice": 100000.00, "endsAt": "2026-10-12T15:00:00Z" }
// 201: objeto Auction (sin pujas)
```
Errores: 400 `BAD_USER_INPUT` (`endsAt` en el pasado, `basePrice` <= 0, o ya existe una subasta para ese `itemId`).

**GET `/auctions/{auctionId}`** — una subasta por id.
- 200: objeto `Auction`. Errores: 404 `NOT_FOUND`.

**GET `/auctions?itemIds=a,b,c`** — subastas de varios ítems en una sola llamada (para el listado y para `auction(itemId)`).
- 200: `[ Auction, ... ]`. Los ítems sin subasta no aparecen. Si ninguno existe, responde `[]` (no 404).

**GET `/auctions?ids=12,13`** — subastas por id (para `WalletMovement.auction`, `Delivery.auction` y `Notification.auction`).
- 200: `[ Auction, ... ]`.

### 3.2 Pujar

**POST `/auctions/{auctionId}/bids`** — paso 2 de la Saga. El Gateway ya reservó el monto en la billetera y manda el id de la reserva.

```json
// Request
{ "userId": "7", "userName": "Ana", "amount": 130000.00, "reservationId": "305" }
// 201
{
  "bid": { "id": "56", "amount": 130000.00, "bidder": { "id": "7", "name": "Ana" }, "createdAt": "2026-10-09T14:10:00Z" },
  "auction": { /* objeto Auction ya actualizado */ },
  "releasedReservationId": null
}
```

Todo ocurre en **una sola transacción**, con la fila de la subasta bloqueada (`SELECT ... FOR UPDATE`), en este orden:
1. Si la subasta no existe: 404 `NOT_FOUND`.
2. Si `status` es `CLOSED`: 409 `AUCTION_CLOSED`.
3. Si `amount` < `currentPrice` + 100 (la puja debe superar el precio actual en al menos 100): 409 `BID_TOO_LOW`.
4. Se guarda la puja con su `reservationId` y pasa a ser la ganadora.
5. `COMMIT`. Después se publica `PrecioActualizado` y, si el ganador anterior era **otra** persona, `PujaSuperada` con la reserva de esa persona (`eventos.md`).

`releasedReservationId` trae la reserva anterior **del mismo usuario** cuando ya iba ganando y sube su propia puja. En ese caso no se publica `PujaSuperada` (no hay a quién avisar) y el Gateway libera esa reserva él mismo. En cualquier otro caso es `null`.

Si dos personas pujan al mismo tiempo, el bloqueo hace que una espere: la segunda ve el precio nuevo y recibe `BID_TOO_LOW`. El Gateway libera su reserva (compensación).

### 3.3 Cierre

**POST `/auctions/close-expired`** — lo llama Pz_cierre_cl cada cierto tiempo, no el Gateway. Cierra las subastas `OPEN` con `endsAt` vencido y publica un `SubastaCerrada` por cada una.

```json
// 200
{ "closed": 3 }
```
Llamarlo dos veces seguidas no cierra nada dos veces (la segunda responde `{ "closed": 0 }`).

### 3.4 La Saga de `placeBid` (la coordina el Gateway)

| Paso | Llamada | Si falla |
|---|---|---|
| 1. Reservar | Pz_billetera_cl `POST /users/{userId}/wallet/reservations` `{ auctionId, amount }` | 422 `INSUFFICIENT_FUNDS` o 404 → se devuelve el error y no hay nada que deshacer |
| 2. Pujar | Pz_subastas_cl `POST /auctions/{auctionId}/bids` `{ userId, userName, amount, reservationId }` | 404 / 409 → paso 3 y se devuelve el error de subastas |
| 3. Compensar | Pz_billetera_cl `POST /users/{userId}/wallet/reservations/{reservationId}/release` | Se reintenta; como es idempotente, repetirlo no hace daño |
| 4. Limpiar | Si la respuesta del paso 2 trae `releasedReservationId`: liberarla con el mismo endpoint del paso 3 | Se reintenta; la puja ya quedó guardada y no se deshace |

La devolución de dinero al postor superado **no** la hace el Gateway: llega a la billetera por el evento `PujaSuperada`.

Si el paso 2 no responde (timeout), el Gateway no sabe si la puja quedó guardada. Consulta `GET /auctions/{auctionId}`: si `winningBid` es de este usuario con ese monto, la Saga terminó bien; si no, compensa.

---

## 4. Pz_catalogo_cl (MongoDB `pz-catalogo-db`)

Dueño de: ítems y sus documentos. No sabe nada de subastas. Sin cambios desde la v2.

### Objeto Item

```json
{
  "id": "64f1c0aa9b1e8a0012ab34cd",
  "name": "Reloj de bolsillo 1920",
  "description": "Plata, funcionando",
  "category": "Relojes",
  "images": ["https://.../1.jpg"],
  "documents": ["https://.../certificado.pdf"],
  "basePrice": 100000.00
}
```

**GET `/items?search=reloj`** — listado; `search` es opcional y busca en nombre y descripción (sin distinguir mayúsculas).
- 200: `[ Item, ... ]` (puede ser `[]`).

**GET `/items?ids=a,b,c`** — varios ítems por id en una sola llamada (para `Auction.item` cuando se piden varias subastas).
- 200: `[ Item, ... ]`. Los ids que no existen no aparecen.

**GET `/items/{itemId}`** — un ítem.
- 200: `Item`. Errores: 404 `NOT_FOUND`. (El Gateway convierte este 404 en `null` en `Query.item`.)

**POST `/items`** — crear ítem.

```json
// Request
{ "name": "Reloj de bolsillo 1920", "description": "Plata", "category": "Relojes",
  "images": ["https://.../1.jpg"], "documents": [], "basePrice": 100000.00 }
// 201: objeto Item
```
Errores: 400 `BAD_USER_INPUT` (`name` vacío, `basePrice` <= 0).

---

## 5. Pz_postpuja_cl (MongoDB `pz-postpuja-db`)

Dueño de: entregas de las piezas ganadas. Las crea al recibir `SubastaCerrada` (no hay endpoint para crearlas).

### Objeto Delivery

```json
{
  "id": "6726a1f0c3b2a90012ab0001",
  "auctionId": "12",
  "itemId": "64f1c0aa9b1e8a0012ab34cd",
  "winnerId": "7",
  "amount": 150000.00,
  "status": "PENDING",
  "createdAt": "2026-11-02T20:00:00Z",
  "confirmedAt": null
}
```

**GET `/deliveries?winnerId={userId}`** — entregas del usuario, de la más reciente a la más antigua.
- 200: `[ Delivery, ... ]` (puede ser `[]`). Errores: 400 `BAD_USER_INPUT` si falta `winnerId`.

**POST `/deliveries/{deliveryId}/confirm`** — el ganador confirma que recibió la pieza.

```json
// Request (el Gateway pone el userId del JWT)
{ "winnerId": "7" }
// 200: objeto Delivery con status CONFIRMED y confirmedAt
```
Errores: 404 `NOT_FOUND` (no existe o no es de ese usuario), 400 `BAD_USER_INPUT` (ya estaba confirmada).

---

## 6. Pz_notificaciones_cl (Redis `pz-notificaciones-db`)

Dueño de: las notificaciones de cada usuario. Las crea al recibir `UsuarioRegistrado`, `PujaSuperada` y `SubastaCerrada` (no hay endpoint para crearlas).

### Objeto Notification

```json
{
  "id": "b7e1c2d4-9f0a-4c3b-8e2d-5a6f7c8d9e01",
  "userId": "9",
  "type": "OUTBID",
  "message": "Tu puja fue superada",
  "auctionId": "12",
  "createdAt": "2026-11-02T14:10:00Z"
}
```

- `type` es `WELCOME`, `OUTBID`, `AUCTION_WON` o `AUCTION_LOST` (los mismos valores de `NotificationType` en el schema).
- `auctionId` es `null` en `WELCOME`.
- `id` es el `eventId` del evento que la generó; así, si el evento llega dos veces, no se repite la notificación.

**GET `/notificaciones/{userId}`** — notificaciones del usuario, de la más reciente a la más antigua.
- 200: `[ Notification, ... ]` (puede ser `[]`).

---

## 7. Qué endpoint usa cada cosa del schema

### Queries

| Schema | Llamadas del Gateway |
|---|---|
| `items(search)` | Pz_catalogo_cl `GET /items?search=` |
| `Item.auction` (en el listado) | Pz_subastas_cl `GET /auctions?itemIds=` (una sola llamada para todo el listado) |
| `item(id)` | Pz_catalogo_cl `GET /items/{itemId}` |
| `auction(itemId)` | Pz_subastas_cl `GET /auctions?itemIds={itemId}` (lista vacía -> `null`) + Pz_catalogo_cl `GET /items/{itemId}` para `Auction.item` |
| `me` | Pz_usuarios_cl `GET /users/{userId}` |
| `wallet` | Pz_billetera_cl `GET /users/{userId}/wallet` + (si piden `movements.auction`) Pz_subastas_cl `GET /auctions?ids=` |
| `myDeliveries` | Pz_postpuja_cl `GET /deliveries?winnerId={userId}` + Pz_subastas_cl `GET /auctions?ids=` para `Delivery.auction` |
| `myNotifications` | Pz_notificaciones_cl `GET /notificaciones/{userId}` + (si piden `auction`) Pz_subastas_cl `GET /auctions?ids=` |

### Mutations

| Schema | Llamadas del Gateway |
|---|---|
| `login` | Pz_usuarios_cl `POST /users/verify-credentials` -> el Gateway firma el JWT |
| `register` | Pz_usuarios_cl `POST /users` -> el Gateway firma el JWT (la billetera se crea por el evento `UsuarioRegistrado`) |
| `updateUser` | Pz_usuarios_cl `PATCH /users/{userId}` |
| `deleteUser` | Pz_usuarios_cl `DELETE /users/{userId}` |
| `placeBid` | Saga del §3.4: Pz_billetera_cl reservar -> Pz_subastas_cl pujar -> (si falla) Pz_billetera_cl liberar |
| `deposit` | Pz_billetera_cl `POST /users/{userId}/wallet/deposits` |
| `createItem` | Pz_catalogo_cl `POST /items` -> Pz_subastas_cl `POST /auctions` (si `endsAt` no viene, el Gateway usa una duración por defecto) |
| `confirmDelivery(id)` | Pz_postpuja_cl `POST /deliveries/{id}/confirm` con `{ "winnerId": userId }` |

### Subscription

| Schema | Cómo funciona |
|---|---|
| `auctionUpdated(auctionId)` | El Gateway consume `PrecioActualizado` (`eventos.md`, §3) con una cola propia por copia. Por cada evento lee la subasta en Pz_subastas_cl (`GET /auctions/{auctionId}`), le agrega `item` desde Pz_catalogo_cl y la envía a los suscriptores de esa subasta. Así funciona aunque haya varias copias del Gateway. |

### Campos de tipos que el Gateway completa

| Campo | De dónde sale |
|---|---|
| `Auction.item` | Pz_catalogo_cl (`GET /items/{itemId}` o `GET /items?ids=`) |
| `Auction.winningBid`, `Auction.participants`, `Bid.bidder` | Vienen dentro del `Auction` de Pz_subastas_cl |
| `WalletMovement.auction`, `Delivery.auction`, `Notification.auction` | Pz_subastas_cl `GET /auctions?ids=` |

---

## 8. Qué ajusta cada servicio

Diferencias entre este contrato y el código de `developcito` y de las ramas de trabajo al momento de escribirlo. Los ajustes de eventos están en `eventos.md`, §5.

| Servicio | Ajuste |
|---|---|
| Pz_usuarios_cl | Renombrar `POST /auth/login` a `POST /users/verify-credentials`. Errores en formato `{code, message}`: `USER_ALREADY_EXISTS` -> `EMAIL_TAKEN`, `USER_NOT_FOUND` -> `NOT_FOUND`, `ACCOUNT_INACTIVE` -> `INVALID_CREDENTIALS`. `PATCH` acepta `name`, `email` y `password` (hoy `name` y `role`). Ids como texto. |
| Pz_billetera_cl | Agregar `POST .../wallet/reservations` y `.../reservations/{id}/release` con reservas identificadas (hoy `POST /users/{id}/reserve` y `/refund` reciben un monto). Quitar los endpoints `/users` y `/users/verify-credentials` que quedaron de la entrega 1. |
| Pz_subastas_cl | Dejar de llamar a la billetera dentro de la puja (`ReserveFunds`/`RefundFunds`). Recibir `reservationId` y `userName`, guardar ambos con la puja y devolver `releasedReservationId`. Dejar de leer el nombre del postor con un JOIN a la tabla `users`: con las bases separadas, los usuarios nuevos no están en `pz-subastas-db`. |
| Pz_notificaciones_cl | Devolver el objeto `Notification` de §6 (hoy devuelve `user_id`, `event`, `auction_id`, `data`, `received_at`). |
| `schema.graphql` | Agregar `CHARGE` a `MovementType` (cobro al ganador al cerrar). |
| Pz_api_ag | Clientes de usuarios, billetera, postpuja y notificaciones (KAN-77), la Saga de `placeBid` (KAN-78) y `auctionUpdated` desde `PrecioActualizado` (KAN-79). |

## 9. Preguntas abiertas

1. **Subir la propia puja.** Con reservas identificadas, quien ya va ganando y sube su puja necesita tener disponible el monto nuevo completo; la reserva anterior se libera después (paso 4 de la Saga). En la v2 bastaba con la diferencia. Se acepta por simplicidad; si molesta, la billetera podría ampliar una reserva existente.
2. **Ítem sin subasta.** Si `POST /items` funciona y `POST /auctions` falla, queda un ítem sin subasta. Hoy se acepta (el listado lo muestra sin precio); una Saga para `createItem` queda fuera del prototipo.
