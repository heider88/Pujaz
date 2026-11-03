// Agrega a las pruebas comparaciones como toBeInTheDocument() y simula la navegación de Next.js.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { cookieSesion, navegacion } from './navegacion'

// useRouter, usePathname y useSearchParams solo existen dentro de Next.js: aquí se reemplazan
// por la versión de prueba (ver navegacion.ts).
vi.mock('next/navigation', () => ({
  usePathname: () => navegacion.ruta,
  useSearchParams: () => navegacion.busqueda,
  useRouter: () => ({
    push: navegacion.push,
    replace: navegacion.replace,
    refresh: navegacion.refresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// La cookie del JWT la ponen y la borran Server Actions, que solo corren en el servidor de Next.js.
vi.mock('../app/actions', () => ({
  setAuthCookie: cookieSesion.poner,
  clearAuthCookie: cookieSesion.borrar,
}))

// cerrarSesion recarga la página para ir al inicio; jsdom no navega, así que solo se registra.
Object.defineProperty(window, 'location', {
  configurable: true,
  value: { ...window.location, assign: vi.fn() },
})

// Desmonta lo que dibujó cada prueba para que no se mezcle con la siguiente.
afterEach(() => {
  cleanup()
})
