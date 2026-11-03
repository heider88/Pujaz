// Página para rutas que no existen.
import Link from 'next/link'

export default function NoEncontrada() {
  return (
    <section className="pagina-angosta">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe.</p>
      <Link href="/">Volver a las subastas</Link>
    </section>
  )
}
