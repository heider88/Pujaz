'use client'
// Encabezado común de todas las páginas: logo, menú y sesión.
// Es Client Component porque depende de la sesión del navegador y de la ruta actual.
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import type { Usuario } from '../api/usuarios'
import { useSesion } from '../session/SessionContext'

// Enlace del menú que se marca cuando es la página actual (como el NavLink de la SPA).
function EnlaceMenu({ href, ruta, children }: { href: string; ruta: string | null; children: ReactNode }) {
  const activo = ruta === href
  return (
    <Link href={href} className={activo ? 'active' : undefined} aria-current={activo ? 'page' : undefined}>
      {children}
    </Link>
  )
}

function Menu({ usuario, ruta }: { usuario: Usuario | null; ruta: string | null }) {
  return (
    <nav className="layout-nav" aria-label="Menú principal">
      <EnlaceMenu href="/" ruta={ruta}>
        Subastas
      </EnlaceMenu>
      {usuario ? (
        <>
          {usuario.role === 'vendedor' && (
            <EnlaceMenu href="/publicar" ruta={ruta}>
              Publicar artículo
            </EnlaceMenu>
          )}
          <EnlaceMenu href="/billetera" ruta={ruta}>
            Mi billetera
          </EnlaceMenu>
          <EnlaceMenu href="/perfil" ruta={ruta}>
            Mi perfil
          </EnlaceMenu>
        </>
      ) : (
        <>
          <EnlaceMenu href="/login" ruta={ruta}>
            Iniciar sesión
          </EnlaceMenu>
          <EnlaceMenu href="/registro" ruta={ruta}>
            Crear cuenta
          </EnlaceMenu>
        </>
      )}
    </nav>
  )
}

// La ruta actual solo se conoce al pedir la página (por ejemplo /items/42), así que el menú
// se dibuja primero sin marcar y luego marca la página actual.
function MenuConRuta({ usuario }: { usuario: Usuario | null }) {
  return <Menu usuario={usuario} ruta={usePathname()} />
}

export function Encabezado() {
  const { usuario, cerrarSesion } = useSesion()
  const router = useRouter()

  function salir() {
    router.push('/')
    cerrarSesion()
  }

  return (
    <header className="layout-header">
      <Link href="/" className="layout-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/emblema.png" alt="" width={240} height={192} />
        Pujaz
      </Link>
      <Suspense fallback={<Menu usuario={usuario} ruta={null} />}>
        <MenuConRuta usuario={usuario} />
      </Suspense>
      {usuario && (
        <div className="layout-usuario">
          <span className="layout-saludo">
            <span>Hola, {usuario.name}</span>
            <span className="layout-rol">{usuario.role === 'vendedor' ? 'Vendedor' : 'Comprador'}</span>
          </span>
          <button type="button" className="boton-enlace" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      )}
    </header>
  )
}
