# Seguridad - Pujaz

## Descripción

Resume cómo se protege Pujaz hoy, qué cambio proponemos para la autenticación y en qué se diferencia el prototipo de lo que se hace en producción. Los componentes que se nombran son los de la [vista C&C](vista-cc.md).

## Cómo está hoy

- **Red** (`docker-compose.yml`). Hay tres redes:
  - `public`: solo la usa `pz-web-proxy` (Nginx), el único servicio con puerto hacia afuera además del panel de RabbitMQ (ver limitaciones).
  - `backend` (interna): el gateway, los microservicios y RabbitMQ.
  - `data` (interna): las bases de datos.

  El navegador nunca llega a un microservicio ni a una base de datos.
- **Autenticación** (`Pz_api_ag/src/modules/auth/`):
  - el gateway firma y verifica un JWT HS256 con `sub` (id del usuario), `role` y vencimiento de 24 h;
  - `JWT_SECRET` es obligatorio y debe tener al menos 32 caracteres (`config.ts`);
  - el token llega en `Authorization: Bearer` o en la cookie `pujaz_token` (`server.ts`);
  - en cada petición se comprueba que el usuario del token siga existiendo (`auth.service.ts`).
- **Web** (`Pz_web_fe/src/app/actions.ts`): el token se guarda en una cookie `httpOnly`, con `sameSite: lax` y `secure` en producción. El JavaScript de la página no puede leerlo.
- **Autorización** (`Pz_api_ag`):
  - toda operación protegida empieza con `requireUser` (`core/context.ts`);
  - el usuario sale del token, nunca de los argumentos: nadie puede pujar ni recargar a nombre de otro;
  - `createItem` solo lo permite el rol `vendedor`;
  - Pz_postpuja_cl responde `NOT_FOUND` a quien intenta confirmar una entrega ajena, para no revelar que existe.
- **Microservicios:**
  - no validan JWT: confían en que solo el gateway les habla por la red interna (`contrato/rest.md` §0);
  - las contraseñas se guardan con bcrypt y nunca se devuelven;
  - el gateway solo deja pasar los campos del contrato (`infrastructure/http/contract.ts`).
- **Errores** (`core/errors.ts`): todo error sale con un código permitido. Una excepción inesperada se convierte en `INTERNAL` con un mensaje genérico, y la causa solo va al log.

## Propuesta: que Pz_usuarios_cl emita el token

Hoy el gateway firma el JWT con lo que le responde Pz_usuarios_cl. Proponemos separar las dos tareas:

- **Pz_usuarios_cl emite** el token al hacer login, firmado con **RS256** y su **clave privada**. Es el dueño de la identidad: sabe quién es el usuario, su rol y si su cuenta está activa.
- **El gateway solo verifica** con la **clave pública**:
  - no puede fabricar tokens, aunque alguien lo comprometa;
  - verificar la firma es local, así que no hay que llamar a Pz_usuarios_cl en cada petición.

Con HS256 esta separación no serviría: quien verifica tiene la misma clave y también podría firmar.

**Qué cambia:**
- `contrato/rest.md` §1: el login devuelve `{ token, user }`;
- Pz_usuarios_cl genera el token;
- el gateway deja de firmar.

**Estado:** propuesta, pendiente de acordar con el equipo.

## Comparación con la práctica en producción

| Práctica | Pujaz hoy | En el prototipo |
|---|---|---|
| Proveedor de identidad con OAuth 2.0 / OpenID Connect (Keycloak, Auth0, Cognito) | El gateway firma los tokens | Pz_usuarios_cl como emisor (propuesta anterior) |
| El gateway valida en el borde con las claves públicas del emisor (JWKS) | El gateway valida | Sin cambio |
| Tokens de acceso cortos (5–15 min) con *refresh token* | Un token de 24 h, sin *refresh* | Se acepta; queda como mejora |
| En la web, el navegador solo tiene una cookie `httpOnly` (patrón BFF) | Así funciona `Pz_web_fe` | Sin cambio |
| *Zero trust*: los servicios se autentican entre sí (mTLS, *service mesh*) | Confían en la red `backend` | Fuera de alcance; decisión documentada |
| Autorización en dos niveles: el gateway revisa permisos generales y cada servicio, sus propios datos | Rol en el gateway; postpuja revisa al dueño de la entrega | Sin cambio |
| Secretos en un gestor (Vault, KMS) con rotación | Variables en `.env` | Se acepta para el prototipo |

## Limitaciones conocidas

- Los microservicios no se autentican entre sí: quien entre a la red `backend` puede llamarlos directamente.
- El panel de RabbitMQ está publicado en el puerto `15672` con el usuario `guest`/`guest`.
- Si Pz_usuarios_cl no responde, el gateway acepta cualquier token bien firmado sin comprobar que el usuario exista. Se prefirió que el sistema siga funcionando.
- El rol va dentro del token: un cambio de rol se aplica cuando el usuario vuelve a iniciar sesión (hasta 24 h).
- No hay límite de intentos de login ni de complejidad de las consultas GraphQL.
- La suscripción `auctionUpdated` es pública a propósito: muestra la subasta y solo el id y el nombre de quienes pujan, sin correos.
