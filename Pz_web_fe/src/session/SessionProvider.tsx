'use client'
// Guarda la sesión: el JWT queda en el navegador y el usuario se pide con `me`.
// En el servidor no hay sesión (no hay localStorage): las partes privadas se dibujan al hidratar.
// KAN-66 (Heider) cambia esto a cookie httpOnly para que el servidor sepa quién está conectado.
import { useApolloClient, useQuery } from '@apollo/client/react'
import { useCallback, useMemo, type ReactNode, useState, useEffect } from 'react'
import { clearAuthCookie, setAuthCookie } from '../app/actions'
import { codigoError } from '../api/errores'
import { ME, type AuthPayload } from '../api/usuarios'
import { SessionContext, type Sesion } from './SessionContext'

export function SessionProvider({ children, usuarioInicial }: { children: ReactNode, usuarioInicial: import('../api/usuarios').Usuario | null }) {
  const client = useApolloClient()
  const [usuario, setUsuario] = useState(usuarioInicial)

  const iniciarSesion = useCallback(
    ({ token: nuevoToken, user }: AuthPayload) => {
      client.writeQuery({ query: ME, data: { me: user } })
      setUsuario(user)
      setAuthCookie(nuevoToken).catch(console.error)
    },
    [client],
  )

  const cerrarSesion = useCallback(() => {
    setUsuario(null)
    void client.clearStore()
    clearAuthCookie().catch(console.error).finally(() => window.location.href = '/')
  }, [client])

  const sesion = useMemo<Sesion>(
    () => ({
      usuario,
      cargando: false,
      iniciarSesion,
      cerrarSesion,
    }),
    [usuario, iniciarSesion, cerrarSesion],
  )

  return <SessionContext.Provider value={sesion}>{children}</SessionContext.Provider>
}
