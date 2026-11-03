'use client'
// Reloj de la subasta: cuánto falta para el cierre, actualizado cada segundo.
// "compacta" es la versión pequeña de las tarjetas del listado.
import { formatearCuentaRegresiva } from '../utils/formato'
import { useAhora } from '../utils/reloj'

export function CuentaRegresiva({ hasta, compacta = false }: { hasta: string; compacta?: boolean }) {
  const ahora = useAhora()
  const restante = ahora === null ? null : new Date(hasta).getTime() - ahora

  let texto = '--:--:--'
  if (restante !== null) texto = restante > 0 ? formatearCuentaRegresiva(restante) : 'Cerrando…'

  return (
    <p className={`cuenta-regresiva${compacta ? ' cuenta-regresiva--compacta' : ''}`} aria-label="Tiempo restante">
      <span className="cuenta-regresiva__etiqueta">Cierra en</span>
      <time dateTime={hasta}>{texto}</time>
    </p>
  )
}
