// Listado de artículos en subasta con buscador (query `items`).
import { useQuery } from '@apollo/client/react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GET_ITEMS } from '../api/items'
import { formatearPrecio, nombreEstado } from '../utils/formato'

export function ListadoPage() {
  // Lo que la persona escribe en la caja de texto.
  const [texto, setTexto] = useState('')
  // Lo que de verdad se busca (cambia solo al enviar el formulario).
  const [busqueda, setBusqueda] = useState('')

  const { data, loading, error, refetch } = useQuery(GET_ITEMS, {
    variables: { search: busqueda || null },
  })

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setBusqueda(texto.trim())
  }

  return (
    <section>
      <h1>Subastas</h1>

      <form role="search" className="buscador" onSubmit={buscar}>
        <label htmlFor="buscador-texto">Buscar artículos</label>
        <input
          id="buscador-texto"
          type="search"
          placeholder="Nombre o descripción"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {loading && <p>Cargando artículos…</p>}

      {error && (
        <div role="alert" className="mensaje-error">
          <p>No se pudieron cargar los artículos. Intenta de nuevo en un momento.</p>
          <button type="button" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p>
          {busqueda
            ? `No hay artículos que coincidan con «${busqueda}».`
            : 'Todavía no hay artículos en subasta.'}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className="lista-items">
          {data.items.map((item) => (
            <li key={item.id} className="tarjeta-item">
              {item.images[0] && <img src={item.images[0]} alt="" />}
              <div>
                <h2>
                  <Link to={`/items/${item.id}`}>{item.name}</Link>
                </h2>
                {item.category && <p className="categoria">{item.category}</p>}
                <p>
                  {item.auction ? 'Precio actual' : 'Precio base'}:{' '}
                  <strong>{formatearPrecio(item.auction?.currentPrice ?? item.basePrice)}</strong>
                </p>
                {item.auction && (
                  <p className="estado">Subasta {nombreEstado(item.auction.status).toLowerCase()}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
