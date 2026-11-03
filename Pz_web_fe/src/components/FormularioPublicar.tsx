'use client'
// Publicar un artículo (mutation createItem). A la derecha se ve en vivo cómo va a quedar la
// tarjeta en el catálogo, foto incluida. Al terminar lleva al detalle del artículo nuevo.
import { useMutation } from '@apollo/client/react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { mensajeErrorServidor } from '../api/errores'
import { CREATE_ITEM } from '../api/items'
import { formatearPrecio } from '../utils/formato'
import { ImagenLote } from './ImagenLote'

export function FormularioPublicar() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [crear, { loading }] = useMutation(CREATE_ITEM)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [imagen, setImagen] = useState('')
  const [precio, setPrecio] = useState('50000')
  const [cierre, setCierre] = useState('')

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    // El campo datetime-local da la hora local; el contrato la espera en ISO.
    const endsAt = cierre ? new Date(cierre).toISOString() : undefined
    try {
      const { data } = await crear({
        variables: {
          input: {
            name: nombre.trim(),
            description: descripcion.trim() || undefined,
            category: categoria.trim() || undefined,
            images: imagen.trim() ? [imagen.trim()] : [],
            basePrice: Number(precio),
            endsAt,
          },
        },
      })
      // El detalle (y luego el listado) se piden de nuevo al servidor, así que ya incluyen la pieza.
      if (data?.createItem) router.push(`/items/${data.createItem.id}`)
    } catch (e) {
      setError(mensajeErrorServidor(e))
    }
  }

  return (
    <div className="publicar">
      <section className="publicar__formulario">
        <h1>Publicar artículo</h1>
        <p className="entradilla">Tu pieza sale a subasta apenas la publiques.</p>

        {error && (
          <div role="alert" className="mensaje-error">
            {error}
          </div>
        )}

        <form className="formulario" onSubmit={enviar}>
          <label htmlFor="name">Nombre del artículo</label>
          <input
            id="name"
            type="text"
            required
            autoFocus
            placeholder="Ej: Reloj de bolsillo de 1920"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Historia, estado y detalles que ayuden a decidir la puja"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          <label htmlFor="category">Categoría</label>
          <input
            id="category"
            type="text"
            placeholder="Ej: Antigüedades, Arte, Relojería"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />

          <label htmlFor="imageUrl">URL de la imagen (opcional)</label>
          <input
            id="imageUrl"
            type="url"
            placeholder="https://…"
            aria-describedby="ayuda-imagen"
            value={imagen}
            onChange={(e) => setImagen(e.target.value)}
          />
          <small id="ayuda-imagen" className="ayuda">
            Clic derecho sobre una foto en otra página y «Copiar dirección de la imagen». En la vista previa ves si carga.
          </small>

          <div className="formulario__fila">
            <div>
              <label htmlFor="basePrice">Precio base de subasta ($ COP)</label>
              <input
                id="basePrice"
                type="number"
                required
                min="1000"
                step="1000"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="endsAt">Fecha de cierre (opcional)</label>
              <input id="endsAt" type="datetime-local" value={cierre} onChange={(e) => setCierre(e.target.value)} />
            </div>
          </div>
          <small className="ayuda">Sin fecha de cierre, la subasta dura el tiempo por defecto.</small>

          <button type="submit" className="publicar__enviar" disabled={loading}>
            {loading ? 'Publicando…' : 'Publicar artículo'}
          </button>
        </form>
      </section>

      <aside className="publicar__vista" aria-label="Vista previa">
        <p className="publicar__vista-titulo">Así se verá en el catálogo</p>
        <div className="tarjeta-lote">
          <div className="tarjeta-lote__foto">
            {/* key: si cambia la URL, se vuelve a intentar cargar la foto */}
            <ImagenLote key={imagen} src={imagen.trim() || undefined} alt="" nombre={nombre || 'Tu pieza'} />
            <span className="sello sello--abierta">Abierta</span>
          </div>
          <div className="tarjeta-lote__cuerpo">
            {categoria && <p className="categoria">{categoria}</p>}
            <h3 className={nombre ? undefined : 'vista-vacia'}>{nombre || 'Nombre de tu pieza'}</h3>
            <p className="tarjeta-lote__precio">
              Precio base
              <strong>{formatearPrecio(Number(precio) || 0)}</strong>
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
