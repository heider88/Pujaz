// Carga de datos en el servidor: lo que piden las páginas antes de mandar el HTML.
// Un solo lugar para todas las lecturas, así las páginas no saben cómo se habla con el gateway.
//
// KAN-66 (Heider): aquí van también las lecturas privadas (me, wallet, myDeliveries,
// myNotifications), leyendo el JWT de la cookie httpOnly con cookies() de next/headers y
// pasándolo como tercer argumento de consultarGateway.
import 'server-only'
import { GET_ITEM, GET_ITEMS, type ItemDetail, type ItemSummary } from '@/api/items'
import { consultarGateway } from './gateway'

// Listado y búsqueda (query `items`). Sin texto, trae todos los artículos.
export async function obtenerItems(busqueda: string): Promise<ItemSummary[]> {
  const datos = await consultarGateway(GET_ITEMS, { search: busqueda || null })
  return datos.items
}

// Detalle de un artículo (query `item`). null si no existe.
export async function obtenerItem(id: string): Promise<ItemDetail | null> {
  const datos = await consultarGateway(GET_ITEM, { id })
  return datos.item
}
