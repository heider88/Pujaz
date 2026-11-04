'use client'

import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { formatearFecha } from '../utils/formato'

const MY_NOTIFICATIONS = gql`
  query MyNotifications {
    myNotifications {
      id
      type
      message
      createdAt
    }
  }
`

interface NotificationData {
  id: string
  type: string
  message: string
  createdAt: string
}

export function NotificacionesUsuario() {
  const { data, loading, error } = useQuery<{ myNotifications: NotificationData[] }>(MY_NOTIFICATIONS)

  if (loading) return <p>Cargando notificaciones...</p>
  if (error) return <p className="mensaje-error">Error al cargar notificaciones.</p>
  
  const notifs = data?.myNotifications || []

  if (notifs.length === 0) {
    return <p className="nota">No tienes notificaciones recientes.</p>
  }

  return (
    <ul className="lista-basica">
      {notifs.map((n) => (
        <li key={n.id}>
          <p><strong>{n.type === 'WELCOME' ? '👋 ' : n.type === 'AUCTION_WON' ? '🎉 ' : '🔔 '}{n.message}</strong></p>
          <p className="fecha">{formatearFecha(n.createdAt)}</p>
        </li>
      ))}
    </ul>
  )
}
