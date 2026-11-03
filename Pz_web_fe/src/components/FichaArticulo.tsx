// Detalle de un artículo ya cargado: galería, ficha y panel de la subasta.
// Esta parte no tiene estado propio; la galería y el panel en vivo son Client Components.
import Link from 'next/link'
import type { ItemDetail } from '../api/items'
import { formatearPrecio } from '../utils/formato'
import { Galeria } from './Galeria'
import { PanelSubasta } from './PanelSubasta'

export function FichaArticulo({ item }: { item: ItemDetail }) {
  return (
    <article className="detalle">
      <Link href="/" className="volver">
        ← Volver a las subastas
      </Link>

      <div className="detalle__rejilla">
        <div className="detalle__principal">
          <Galeria nombre={item.name} imagenes={item.images} />

          <div className="detalle__ficha">
            {item.category && <p className="categoria">{item.category}</p>}
            <h1>{item.name}</h1>
            {item.description && <p className="descripcion">{item.description}</p>}
            <p className="precio-base">
              Precio base <strong>{formatearPrecio(item.basePrice)}</strong>
            </p>

            {item.documents.length > 0 && (
              <section className="documentos">
                <h2>Documentos</h2>
                <ul>
                  {item.documents.map((url, i) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Documento {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <aside className="detalle__lateral">
          {item.auction ? (
            <PanelSubasta subasta={item.auction} />
          ) : (
            <section aria-labelledby="titulo-subasta" className="panel-subasta">
              <h2 id="titulo-subasta">Subasta</h2>
              <p>Este artículo todavía no tiene subasta.</p>
            </section>
          )}
        </aside>
      </div>
    </article>
  )
}

export function ArticuloNoEncontrado() {
  return (
    <section className="pagina-angosta">
      <h1>Artículo no encontrado</h1>
      <p>Este artículo no existe o fue retirado.</p>
      <Link href="/">Volver a las subastas</Link>
    </section>
  )
}
