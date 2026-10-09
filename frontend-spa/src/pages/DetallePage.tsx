// Esqueleto: se completa en los siguientes sprints.
import { useParams } from 'react-router-dom'

export function DetallePage() {
  const { id } = useParams()
  return <h1>Detalle del artículo {id}</h1>
}
