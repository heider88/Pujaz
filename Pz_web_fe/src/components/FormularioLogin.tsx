'use client'
// Iniciar sesión (mutation login). Guarda el JWT y vuelve a la página de donde venía (?desde=...).
import { useMutation } from '@apollo/client/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { codigoError } from '../api/errores'
import { LOGIN } from '../api/usuarios'
import { useSesion } from '../session/SessionContext'

function mensajeDeError(error: unknown): string {
  switch (codigoError(error)) {
    case 'INVALID_CREDENTIALS':
      return 'Correo o contraseña incorrectos.'
    case 'BAD_USER_INPUT':
      return 'Revisa el correo y la contraseña.'
    default:
      return 'No se pudo iniciar sesión. Intenta de nuevo en un momento.'
  }
}

// Solo se regresa a páginas de Pujaz (evita que un enlace mande a otro sitio después del login).
function destinoSeguro(desde: string | null): string {
  return desde && desde.startsWith('/') && !desde.startsWith('//') ? desde : '/'
}

export function FormularioLogin() {
  const { usuario, iniciarSesion } = useSesion()
  const router = useRouter()
  const desde = destinoSeguro(useSearchParams().get('desde'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [login, { loading }] = useMutation(LOGIN)

  if (usuario) {
    return (
      <section>
        <h1>Iniciar sesión</h1>
        <p>Ya iniciaste sesión como {usuario.name}.</p>
        <p>
          <Link href="/">Ir a las subastas</Link>
        </p>
      </section>
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    try {
      const { data } = await login({ variables: { email: email.trim(), password } })
      if (data) {
        router.replace(desde)
        iniciarSesion(data.login)
      }
    } catch (e) {
      setError(e)
    }
  }

  return (
    <section className="pagina-angosta">
      <h1>Iniciar sesión</h1>
      <form className="formulario" onSubmit={enviar}>
        <label htmlFor="login-email">Correo</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
        <label htmlFor="login-password">Contraseña</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
        {error !== null && (
          <p role="alert" className="mensaje-error">
            {mensajeDeError(error)}
          </p>
        )}
      </form>
      <p>
        ¿No tienes cuenta? <Link href="/registro">Crea una</Link>
      </p>
    </section>
  )
}
