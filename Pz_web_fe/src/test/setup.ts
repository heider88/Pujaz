// Agrega a las pruebas comparaciones como toBeInTheDocument() y simula la navegación de Next.js.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { navegacion } from './navegacion'

// useRouter, usePathname y useSearchParams solo existen dentro de Next.js: aquí se reemplazan
// por la versión de prueba (ver navegacion.ts).
vi.mock('next/navigation', () => ({
  usePathname: () => navegacion.ruta,
  useSearchParams: () => navegacion.busqueda,
  useRouter: () => ({
    push: navegacion.push,
    replace: navegacion.replace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Desmonta lo que dibujó cada prueba para que no se mezcle con la siguiente.
afterEach(() => {
  cleanup()
})
