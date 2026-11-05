// Operaciones GraphQL de las entregas (contrato v3: myDeliveries, confirmDelivery). Requieren sesión.
// Las entregas las crea Pz_postpuja_cl cuando una subasta cierra con ganador.
import { gql, type TypedDocumentNode } from '@apollo/client'

export type EstadoEntrega = 'PENDING' | 'CONFIRMED'

export interface Entrega {
  id: string
  amount: number
  status: EstadoEntrega
  createdAt: string
  confirmedAt: string | null
  auction: { id: string; item: { id: string; name: string } }
}

export const MY_DELIVERIES: TypedDocumentNode<{ myDeliveries: Entrega[] }, Record<string, never>> = gql`
  query MyDeliveries {
    myDeliveries {
      id
      amount
      status
      createdAt
      confirmedAt
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

export const CONFIRM_DELIVERY: TypedDocumentNode<
  { confirmDelivery: Pick<Entrega, 'id' | 'status' | 'confirmedAt'> },
  { id: string }
> = gql`
  mutation ConfirmDelivery($id: ID!) {
    confirmDelivery(id: $id) {
      id
      status
      confirmedAt
    }
  }
`
