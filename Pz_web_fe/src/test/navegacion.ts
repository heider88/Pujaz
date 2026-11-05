// Navegación y cookie de sesión simuladas para las pruebas: la ruta actual, los parámetros
// (?desde=...), los espías de router.push / replace / refresh y los de las Server Actions que ponen
// y borran la cookie del JWT, para revisar qué se quiso hacer.
import { vi } from 'vitest'

export const navegacion = {
  ruta: '/',
  busqueda: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}

export const cookieSesion = {
  poner: vi.fn(async (token: string) => {
    void token
  }),
  borrar: vi.fn(async () => {}),
}

export function irA(ruta: string, busqueda = ''): void {
  navegacion.ruta = ruta
  navegacion.busqueda = new URLSearchParams(busqueda)
  navegacion.push.mockClear()
  navegacion.replace.mockClear()
  navegacion.refresh.mockClear()
  cookieSesion.poner.mockClear()
  cookieSesion.borrar.mockClear()
}
