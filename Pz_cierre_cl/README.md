# Pz_cierre_cl — KAN-86

Worker Go sin dependencias externas. Envía POST /auctions/close-expired cada
60 segundos (primer ciclo después de 60 segundos). Usa el contrato real de
Pz_subastas_cl/src/routes/auction_routes.go, no /subastas/cerrar-vencidas.

SUBASTAS_SERVICE_URL por defecto: http://pz-subastas-cl:8080.
Compose lo configura como http://pz-subastas-cl:8081, el puerto real del servicio.
Timeout HTTP de 15 segundos, ciclos secuenciales sin solapamiento, errores en logs
y reintento en el siguiente ciclo. SIGTERM/SIGINT cancela solicitudes y detiene el ticker.
No publica puertos ni accede directamente a bases de datos o RabbitMQ.

Validación: `go test ./...`; construcción: `docker compose build pz-cierre-cl`.
Arranque: `docker compose up -d pz-cierre-cl`.
Logs: `docker compose logs -f pz-cierre-cl`.

## Coordinación pendiente

Pz_subastas_cl/main.go ya llama a CloseExpiredAuctions cada 10 segundos.
Este worker no elimina ese mecanismo. Antes de activar ambos, el equipo debe
centralizar la planificación o verificar la exclusión/idempotencia del cierre y
sus eventos. La entrega no cambia lógica de negocio ni publica eventos directamente.
