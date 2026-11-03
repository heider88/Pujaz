// Mensaje cuando el servidor no pudo traer los datos del gateway.
// "Reintentar" vuelve a pedir la misma página (el servidor intenta otra vez).
export function ErrorCarga({ mensaje, href }: { mensaje: string; href: string }) {
  return (
    <div role="alert" className="mensaje-error">
      <p>{mensaje}</p>
      <a href={href} className="boton-secundario">
        Reintentar
      </a>
    </div>
  )
}
