// Detalle de un artículo (Server Component): la ficha se pide al gateway en el servidor
// y llega en el HTML. El panel de la subasta toma ese estado inicial y sigue en vivo
// en el navegador por WebSocket.
import { Suspense } from 'react'
import { ErrorCarga } from '@/components/ErrorCarga'
import { ArticuloNoEncontrado, FichaArticulo } from '@/components/FichaArticulo'
import { obtenerItem } from '@/lib/datos'

async function Detalle({ params }: { params: PageProps<'/items/[id]'>['params'] }) {
  const { id } = await params
  let item
  try {
    item = await obtenerItem(id)
  } catch {
    return (
      <ErrorCarga
        mensaje="No se pudo cargar el artículo. Intenta de nuevo en un momento."
        href={`/items/${encodeURIComponent(id)}`}
      />
    )
  }
  if (!item) return <ArticuloNoEncontrado />
  return <FichaArticulo item={item} />
}

export default function DetallePage({ params }: PageProps<'/items/[id]'>) {
  return (
    <Suspense fallback={<p className="nota">Cargando artículo…</p>}>
      <Detalle params={params} />
    </Suspense>
  )
}
