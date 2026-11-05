// Operación GraphQL de las notificaciones (contrato v3: myNotifications). Requiere sesión.
// Las guarda Pz_notificaciones_cl a partir de los eventos del broker.
import { gql, type TypedDocumentNode } from '@apollo/client'

export type TipoNotificacion = 'WELCOME' | 'OUTBID' | 'AUCTION_WON' | 'AUCTION_LOST'

export interface Notificacion {
  id: string
  type: TipoNotificacion
  message: string
  createdAt: string
  auction: { id: string; item: { id: string; name: string } } | null
}

export const MY_NOTIFICATIONS: TypedDocumentNode<{ myNotifications: Notificacion[] }, Record<string, never>> = gql`
  query MyNotifications {
    myNotifications {
      id
      type
      message
      createdAt
      auction {
        id
        item {
          id
          name
        }
      }
    }
  }
`
