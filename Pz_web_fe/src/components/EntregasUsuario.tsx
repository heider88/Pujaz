'use client'
// Mis entregas (KAN-70): las piezas que ganó el usuario. El ganador confirma cuando la recibe.
import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@apollo/client/react'
import { CONFIRM_DELIVERY, MY_DELIVERIES, type EstadoEntrega } from '../api/entregas'
import { formatearFecha, formatearPrecio } from '../utils/formato'

const NOMBRE_ESTADO: Record<EstadoEntrega, string> = {
  PENDING: 'Pendiente de recibir',
  CONFIRMED: 'Recibida',
}

export function EntregasUsuario() {
  const { data, loading, error } = useQuery(MY_DELIVERIES, { fetchPolicy: 'cache-and-network' })
  const [confirmar] = useMutation(CONFIRM_DELIVERY)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [errorConfirmar, setErrorConfirmar] = useState<string | null>(null)

  async function confirmarEntrega(id: string) {
    setConfirmando(id)
    setErrorConfirmar(null)
    try {
      // Apollo actualiza la entrega en la caché con el id, status y confirmedAt que devuelve.
      await confirmar({ variables: { id } })
    } catch {
      setErrorConfirmar('No se pudo confirmar la entrega. Intenta de nuevo.')
    } finally {
      setConfirmando(null)
    }
  }

  if (loading && !data) return <p className="nota">Cargando entregas…</p>
  if (error) return <p className="mensaje-error">No se pudieron cargar tus entregas.</p>

  const entregas = data?.myDeliveries ?? []
  if (entregas.length === 0) {
    return <p className="nota">Aún no tienes entregas. Cuando ganes una subasta, la verás aquí.</p>
  }

  return (
    <>
      {errorConfirmar && (
        <p className="mensaje-error" role="alert">
          {errorConfirmar}
        </p>
      )}
      <ul className="lista-basica" aria-label="Mis entregas">
        {entregas.map((e) => (
          <li key={e.id}>
            <strong>
              <Link href={`/items/${e.auction.item.id}`}>{e.auction.item.name}</Link>
            </strong>
            <p>Pagaste {formatearPrecio(e.amount)}</p>
            <p>
              {NOMBRE_ESTADO[e.status]}
              {e.confirmedAt && ` el ${formatearFecha(e.confirmedAt)}`}
            </p>
            <p className="fecha">Ganada el {formatearFecha(e.createdAt)}</p>
            {e.status === 'PENDING' && (
              <button
                type="button"
                className="boton-secundario"
                onClick={() => confirmarEntrega(e.id)}
                disabled={confirmando === e.id}
              >
                {confirmando === e.id ? 'Confirmando…' : 'Ya la recibí'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
