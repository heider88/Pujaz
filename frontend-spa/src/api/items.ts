// Consultas GraphQL de artículos (contrato: items y item).
// Los tipos de TypeScript describen exactamente los campos que pedimos.
import { gql, type TypedDocumentNode } from '@apollo/client'

export type AuctionStatus = 'OPEN' | 'CLOSED'

export interface AuctionSummary {
  id: string
  currentPrice: number
  status: AuctionStatus
  endsAt: string
}

export interface ItemSummary {
  id: string
  name: string
  category: string | null
  images: string[]
  basePrice: number
  auction: AuctionSummary | null
}

export interface ItemDetail extends ItemSummary {
  description: string | null
  documents: string[]
}

// Listado y búsqueda: search es opcional (null = todos los artículos).
export const GET_ITEMS: TypedDocumentNode<
  { items: ItemSummary[] },
  { search: string | null }
> = gql`
  query GetItems($search: String) {
    items(search: $search) {
      id
      name
      category
      images
      basePrice
      auction {
        id
        currentPrice
        status
        endsAt
      }
    }
  }
`

// Detalle de un artículo: item es null si no existe.
export const GET_ITEM: TypedDocumentNode<{ item: ItemDetail | null }, { id: string }> = gql`
  query GetItem($id: ID!) {
    item(id: $id) {
      id
      name
      description
      category
      images
      documents
      basePrice
      auction {
        id
        currentPrice
        status
        endsAt
      }
    }
  }
`
