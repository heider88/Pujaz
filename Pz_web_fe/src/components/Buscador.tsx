// Buscador del listado. Es un formulario normal (GET a "/?q=..."): funciona aunque el JavaScript
// todavía no haya cargado, y la búsqueda queda en la URL (se puede compartir o recargar).
import Form from 'next/form'

export function Buscador({ valor }: { valor: string }) {
  return (
    <Form action="/" role="search" className="buscador">
      <label htmlFor="buscador-texto" className="solo-lector">
        Buscar artículos
      </label>
      <input
        id="buscador-texto"
        name="q"
        type="search"
        placeholder="Busca por nombre o descripción"
        defaultValue={valor}
        key={valor}
      />
      <button type="submit">Buscar</button>
    </Form>
  )
}
