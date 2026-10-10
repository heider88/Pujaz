// Marco común de todas las páginas: encabezado con el menú y el contenido debajo.
import { Link, NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <>
      <header className="layout-header">
        <Link to="/" className="layout-logo">
          Pujaz
        </Link>
        <nav className="layout-nav" aria-label="Menú principal">
          <NavLink to="/" end>
            Subastas
          </NavLink>
          <NavLink to="/billetera">Mi billetera</NavLink>
          <NavLink to="/perfil">Mi perfil</NavLink>
          <NavLink to="/login">Iniciar sesión</NavLink>
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </>
  )
}
