// Sesión del usuario: quién inició sesión y cómo entrar o salir.
// El proveedor está en SessionProvider.tsx; aquí solo el contexto y el hook para leerlo.
import { createContext, useContext } from 'react'
import type { AuthPayload, Usuario } from '../api/usuarios'

export interface Sesion {
  usuario: Usuario | null
  // Se mantiene por compatibilidad: con la cookie, el servidor ya sabe quién es al dibujar.
  cargando: boolean
  iniciarSesion: (datos: AuthPayload) => void
  cerrarSesion: () => void
  // Después de editar el perfil, para que el menú muestre el nombre nuevo sin recargar.
  actualizarUsuario: (usuario: Usuario) => void
}

export const SessionContext = createContext<Sesion | null>(null)

export function useSesion(): Sesion {
  const sesion = useContext(SessionContext)
  if (!sesion) {
    throw new Error('useSesion debe usarse dentro de <SessionProvider>.')
  }
  return sesion
}
