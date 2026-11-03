// Navegación simulada para las pruebas: la ruta actual, los parámetros (?desde=...) y
// los espías de router.push / router.replace para revisar a dónde se quiso ir.
import { vi } from 'vitest'

export const navegacion = {
  ruta: '/',
  busqueda: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
}

export function irA(ruta: string, busqueda = ''): void {
  navegacion.ruta = ruta
  navegacion.busqueda = new URLSearchParams(busqueda)
  navegacion.push.mockClear()
  navegacion.replace.mockClear()
}
