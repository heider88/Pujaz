'use client'
// Mis notificaciones (KAN-70): avisos de bienvenida, puja superada y subastas ganadas o perdidas.
import Link from 'next/link'
import { useQuery } from '@apollo/client/react'
import { MY_NOTIFICATIONS, type TipoNotificacion } from '../api/notificaciones'
import { formatearFecha } from '../utils/formato'

const ETIQUETA: Record<TipoNotificacion, string> = {
  WELCOME: 'Bienvenida',
  OUTBID: 'Puja superada',
  AUCTION_WON: 'Ganaste',
  AUCTION_LOST: 'Subasta cerrada',
}

export function NotificacionesUsuario() {
  const { data, loading, error } = useQuery(MY_NOTIFICATIONS, { fetchPolicy: 'cache-and-network' })

  if (loading && !data) return <p className="nota">Cargando notificaciones…</p>
  if (error) return <p className="mensaje-error">No se pudieron cargar tus notificaciones.</p>

  const notificaciones = data?.myNotifications ?? []
  if (notificaciones.length === 0) {
    return <p className="nota">No tienes notificaciones todavía.</p>
  }

  return (
    <ul className="lista-basica" aria-label="Mis notificaciones">
      {notificaciones.map((n) => (
        <li key={n.id}>
          <p>
            <strong>{ETIQUETA[n.type]}:</strong> {n.message}
          </p>
          {n.auction && (
            <p>
              <Link href={`/items/${n.auction.item.id}`}>{n.auction.item.name}</Link>
            </p>
          )}
          <p className="fecha">{formatearFecha(n.createdAt)}</p>
        </li>
      ))}
    </ul>
  )
}
