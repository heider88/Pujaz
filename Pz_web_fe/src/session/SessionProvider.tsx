'use client'
// Sesión del navegador. El JWT vive en una cookie httpOnly (la ponen las Server Actions de
// app/actions.ts), así que el navegador no lo puede leer: el servidor lo lee al dibujar cada página
// y le pasa aquí el usuario inicial. Este proveedor solo guarda quién es el usuario para el menú y
// los Client Components, y cambia la cookie al entrar o salir.
import { useApolloClient } from '@apollo/client/react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { clearAuthCookie, setAuthCookie } from '../app/actions'
import { ME, type AuthPayload, type Usuario } from '../api/usuarios'
import { SessionContext, type Sesion } from './SessionContext'

export function SessionProvider({ children, usuarioInicial }: { children: ReactNode; usuarioInicial: Usuario | null }) {
  const client = useApolloClient()
  const [usuario, setUsuario] = useState(usuarioInicial)

  const iniciarSesion = useCallback(
    ({ token, user }: AuthPayload) => {
      client.writeQuery({ query: ME, data: { me: user } })
      setUsuario(user)
      setAuthCookie(token).catch(console.error)
    },
    [client],
  )

  const cerrarSesion = useCallback(() => {
    setUsuario(null)
    void client.clearStore()
    // Recarga completa al inicio: las páginas privadas ya dibujadas en el servidor no deben quedar a la vista.
    clearAuthCookie()
      .catch(console.error)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa a propósito
      .finally(() => window.location.assign('/'))
  }, [client])

  const actualizarUsuario = useCallback((nuevo: Usuario) => setUsuario(nuevo), [])

  const sesion = useMemo<Sesion>(
    () => ({ usuario, cargando: false, iniciarSesion, cerrarSesion, actualizarUsuario }),
    [usuario, iniciarSesion, cerrarSesion, actualizarUsuario],
  )

  return <SessionContext.Provider value={sesion}>{children}</SessionContext.Provider>
}
