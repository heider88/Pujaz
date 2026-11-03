'use client'

import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { formatearFecha, formatearPrecio } from '../utils/formato'

const MY_DELIVERIES = gql`
  query MyDeliveries {
    myDeliveries {
      id
      status
      amount
      createdAt
      auction {
        id
        item {
          name
        }
      }
    }
  }
`

export function EntregasUsuario() {
  const { data, loading, error } = useQuery(MY_DELIVERIES)

  if (loading) return <p>Cargando entregas...</p>
  if (error) return <p className="mensaje-error">Error al cargar entregas.</p>
  
  const entregas = data?.myDeliveries || []

  if (entregas.length === 0) {
    return <p className="nota">Aún no tienes entregas (gana una subasta para verlas aquí).</p>
  }

  return (
    <ul className="lista-basica">
      {entregas.map((e: any) => (
        <li key={e.id}>
          <strong>{e.auction.item.name}</strong>
          <p>Monto pagado: {formatearPrecio(e.amount)}</p>
          <p>Estado: {e.status}</p>
          <p className="fecha">{formatearFecha(e.createdAt)}</p>
        </li>
      ))}
    </ul>
  )
}
