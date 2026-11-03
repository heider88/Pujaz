// Listado de piezas. Componente de presentación: recibe los artículos ya cargados
// (en el servidor). Sin búsqueda, la subasta abierta que cierra primero va arriba, en grande.
import Link from 'next/link'
import type { ItemSummary } from '../api/items'
import { formatearPrecio } from '../utils/formato'
import { CuentaRegresiva } from './CuentaRegresiva'
import { ImagenLote } from './ImagenLote'

// La subasta abierta con el cierre más cercano (null si no hay ninguna abierta).
export function elegirDestacado(items: ItemSummary[]): ItemSummary | null {
  const abiertas = items.filter((i) => i.auction?.status === 'OPEN')
  abiertas.sort((a, b) => new Date(a.auction!.endsAt).getTime() - new Date(b.auction!.endsAt).getTime())
  return abiertas[0] ?? null
}

function Estado({ item }: { item: ItemSummary }) {
  if (!item.auction) return <span className="sello sello--sin">Sin subasta</span>
  return item.auction.status === 'OPEN' ? (
    <span className="sello sello--abierta">Abierta</span>
  ) : (
    <span className="sello sello--cerrada">Cerrada</span>
  )
}

function LoteDestacado({ item }: { item: ItemSummary }) {
  const subasta = item.auction!
  return (
    <section className="destacado" aria-labelledby="titulo-destacado">
      <div className="destacado__foto">
        <ImagenLote src={item.images[0]} alt={item.name} nombre={item.name} />
      </div>
      <div className="destacado__texto">
        <p className="destacado__motivo">Cierra pronto</p>
        {item.category && <p className="categoria">{item.category}</p>}
        <h2 id="titulo-destacado">{item.name}</h2>
        {item.description && <p className="destacado__descripcion">{item.description}</p>}
        <p className="precio-actual">
          Precio actual
          <strong>
            {formatearPrecio(subasta.currentPrice)} <span className="moneda">COP</span>
          </strong>
        </p>
        <CuentaRegresiva hasta={subasta.endsAt} />
        <Link href={`/items/${item.id}`} className="boton-pujar destacado__accion">
          Ver la subasta y pujar
        </Link>
      </div>
    </section>
  )
}

function Tarjeta({ item }: { item: ItemSummary }) {
  const abierta = item.auction?.status === 'OPEN'
  return (
    <li className="tarjeta-lote">
      <div className="tarjeta-lote__foto">
        <ImagenLote src={item.images[0]} alt="" nombre={item.name} />
        <Estado item={item} />
      </div>
      <div className="tarjeta-lote__cuerpo">
        {item.category && <p className="categoria">{item.category}</p>}
        <h3>
          <Link href={`/items/${item.id}`}>{item.name}</Link>
        </h3>
        <p className="tarjeta-lote__precio">
          {item.auction ? 'Precio actual' : 'Precio base'}
          <strong>{formatearPrecio(item.auction?.currentPrice ?? item.basePrice)}</strong>
        </p>
        {abierta && <CuentaRegresiva hasta={item.auction!.endsAt} compacta />}
      </div>
    </li>
  )
}

export function Catalogo({ items, busqueda }: { items: ItemSummary[]; busqueda: string }) {
  if (items.length === 0) {
    return (
      <p className="nota">
        {busqueda
          ? `No hay piezas que coincidan con «${busqueda}». Prueba con otra palabra o borra la búsqueda.`
          : 'Todavía no hay piezas en subasta. Publica la primera desde «Publicar artículo».'}
      </p>
    )
  }

  const destacado = busqueda ? null : elegirDestacado(items)
  const resto = destacado ? items.filter((i) => i.id !== destacado.id) : items

  return (
    <>
      {destacado && <LoteDestacado item={destacado} />}
      {resto.length > 0 && (
        <section aria-labelledby="titulo-catalogo">
          <h2 id="titulo-catalogo" className="catalogo__titulo">
            {busqueda ? `Resultados para «${busqueda}»` : destacado ? 'Más piezas' : 'Piezas en subasta'}
          </h2>
          <ul className="catalogo">
            {resto.map((item) => (
              <Tarjeta key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
