// Hora actual que avanza cada segundo, para la cuenta regresiva y los "Hace 5 min".
// En el servidor devuelve null: así el HTML del servidor y el del navegador coinciden al hidratar
// y el reloj empieza a contar ya en el navegador.
import { useSyncExternalStore } from 'react'

let ahora = 0
let intervalo: ReturnType<typeof setInterval> | undefined
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  if (oyentes.size === 1) {
    ahora = Date.now()
    intervalo = setInterval(() => {
      ahora = Date.now()
      for (const o of oyentes) o()
    }, 1000)
  }
  return () => {
    oyentes.delete(oyente)
    if (oyentes.size === 0) clearInterval(intervalo)
  }
}

function leer(): number {
  if (!ahora) ahora = Date.now()
  return ahora
}

export function useAhora(): number | null {
  return useSyncExternalStore(suscribir, leer, () => null)
}
