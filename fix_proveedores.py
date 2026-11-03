with open('Pz_web_fe/src/components/Proveedores.tsx', 'r') as f:
    content = f.read()

content = content.replace("export function Proveedores({ children }: { children: ReactNode }) {", "import type { Usuario } from '../api/usuarios'\n\nexport function Proveedores({ children, usuario }: { children: ReactNode, usuario: Usuario | null }) {")
content = content.replace("<SessionProvider>{children}</SessionProvider>", "<SessionProvider usuarioInicial={usuario}>{children}</SessionProvider>")

with open('Pz_web_fe/src/components/Proveedores.tsx', 'w') as f:
    f.write(content)

with open('Pz_web_fe/src/session/SessionProvider.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'", "import { useCallback, useMemo, type ReactNode, useState, useEffect } from 'react'")
content = content.replace("import { clearToken, getToken, saveToken, suscribirToken, tokenEnServidor } from '../api/auth'", "import { clearAuthCookie, setAuthCookie } from '../app/actions'")

content = content.replace("""// false en el servidor y al hidratar; true cuando ya se puede leer el token del navegador.
function sinSuscripcion() {
  return () => {}
}
export function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  )
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient()
  const token = useSyncExternalStore(suscribirToken, getToken, tokenEnServidor)
  const hidratado = useHidratado()

  // Solo se pregunta `me` si hay un token guardado.
  const { data, loading, error } = useQuery(ME, { skip: !token })

  // Si el token venció o no es válido, se trata como sesión cerrada.
  const tokenInvalido = codigoError(error) === 'UNAUTHENTICATED'
  const usuario = token && !tokenInvalido ? (data?.me ?? null) : null

  const iniciarSesion = useCallback(
    ({ token: nuevoToken, user }: AuthPayload) => {
      // Se guarda el usuario en la caché antes del token para no volver a pedirlo.
      client.writeQuery({ query: ME, data: { me: user } })
      saveToken(nuevoToken)
    },
    [client],
  )

  const cerrarSesion = useCallback(() => {
    clearToken()
    // Borra de la caché los datos privados (billetera, perfil).
    void client.clearStore()
  }, [client])

  const sesion = useMemo<Sesion>(
    () => ({
      usuario,
      // Mientras no se haya hidratado, todavía no se sabe si hay sesión.
      cargando: !hidratado || (Boolean(token) && loading),
      iniciarSesion,
      cerrarSesion,
    }),
    [usuario, hidratado, token, loading, iniciarSesion, cerrarSesion],
  )""", """export function SessionProvider({ children, usuarioInicial }: { children: ReactNode, usuarioInicial: import('../api/usuarios').Usuario | null }) {
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
  )""")

with open('Pz_web_fe/src/session/SessionProvider.tsx', 'w') as f:
    f.write(content)
