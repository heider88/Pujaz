// Pruebas con Vitest + Testing Library (en jsdom, como en la SPA).
// Los Server Components async no se pueden montar aquí (lo dice la guía de Next.js):
// se prueban sus piezas (componentes de presentación y src/lib/gateway.ts) y el flujo completo
// queda para las pruebas e2e de Playwright.
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const ruta = (r: string) => fileURLToPath(new URL(r, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': ruta('./src'),
      // `server-only` falla a propósito fuera del servidor de Next.js; en las pruebas no hace nada.
      'server-only': ruta('./src/test/vacio.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
