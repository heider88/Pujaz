# Pz_web_fe · Front-end web de Pujaz (Next.js, SSR)

Componente de presentación web de la entrega 2. Reemplaza a la SPA de la entrega 1 (`Pz_spa_fe`):
mismas pantallas, componentes, estilos y utilidades, pero ahora el HTML de las páginas públicas se
genera en el servidor (Server-Side Rendering) con el App Router de Next.js.

Solo habla con el gateway (`Pz_api_ag`) por el contrato GraphQL de `docs/contrato/schema.graphql`.

## Cómo se reparte el trabajo entre servidor y navegador

| Parte | Dónde corre | Archivos |
|---|---|---|
| Listado y búsqueda (`/`, `/?q=...`) | Servidor | `src/app/page.tsx`, `components/Catalogo.tsx`, `components/Buscador.tsx` |
| Detalle de un artículo (`/items/[id]`) | Servidor | `src/app/items/[id]/page.tsx`, `components/FichaArticulo.tsx` |
| Galería de fotos | Navegador | `components/Galeria.tsx` |
| Panel de la subasta en vivo y puja | Navegador (WebSocket) | `components/PanelSubasta.tsx`, `components/FormularioPuja.tsx` |
| Login, registro y publicar | Navegador | `components/Formulario*.tsx` |
| Perfil y billetera | Navegador por ahora (pasan al servidor en KAN-66) | `components/PerfilUsuario.tsx`, `components/BilleteraUsuario.tsx` |
| Menú y sesión | Navegador | `components/Encabezado.tsx`, `session/` |

- `src/lib/datos.ts` y `src/lib/gateway.ts`: lecturas que hace el servidor al gateway (red interna).
- `src/api/`: operaciones GraphQL tipadas, iguales a las de la SPA.
- `src/api/client.ts`: cliente Apollo del navegador (HTTP + WebSocket con graphql-ws).

## Configuración

Copiar `.env.example` a `.env.local` y ajustar:

- `GATEWAY_URL`: gateway visto desde el servidor de Next.js (por defecto `http://localhost:4000/graphql`).
- `NEXT_PUBLIC_GATEWAY_WS_URL`: solo en desarrollo, WebSocket directo al gateway.

## Comandos

```bash
npm install        # instala las dependencias
npm run dev        # servidor de desarrollo en http://localhost:3000 (necesita el gateway en el puerto 4000)
npm test           # pruebas con Vitest
npm run lint       # ESLint
npm run build      # compilación de producción
```

El gateway se puede correr con datos simulados (`USE_MOCKS=true` en `Pz_api_ag/.env`) y el usuario
de prueba `ana@correo.com` / `secreto123`. En su `.env`, `CORS_ORIGIN=http://localhost:3000`.
