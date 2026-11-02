'use client'
// Mi perfil: ver y editar los datos (updateUser) o eliminar la cuenta (deleteUser).
// Por ahora los datos salen de la sesión del navegador; en KAN-66 (Heider) los carga el servidor.
import { useMutation, useQuery } from '@apollo/client/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { WALLET } from '../api/billetera'
import { codigoError } from '../api/errores'
import { DELETE_USER, UPDATE_USER, type Usuario } from '../api/usuarios'
import { useSesion } from '../session/SessionContext'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { Avatar } from './Avatar'

// Saldo de la billetera en el resumen del perfil. Si no carga, simplemente no se muestra:
// la billetera tiene su propia página con el detalle y los errores.
function SaldoResumen() {
  const { data } = useQuery(WALLET)
  if (!data) return null
  return (
    <div className="perfil__saldo">
      <p>
        Disponible para pujar
        <strong>{formatearPrecio(data.wallet.available)}</strong>
      </p>
      <p>
        Reservado en pujas
        <strong>{formatearPrecio(data.wallet.reserved)}</strong>
      </p>
      <Link href="/billetera">Ver movimientos y recargar</Link>
    </div>
  )
}

const REGLA_NOMBRE = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{3,50}$/
const REGLA_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function mensajeDeError(error: unknown): string {
  switch (codigoError(error)) {
    case 'EMAIL_TAKEN':
      return 'Ya existe otra cuenta con ese correo.'
    case 'BAD_USER_INPUT':
      return 'Revisa los datos: el correo debe ser válido y la contraseña de al menos 8 caracteres.'
    case 'UNAUTHENTICATED':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'No se pudieron guardar los cambios. Intenta de nuevo en un momento.'
  }
}

export function PerfilUsuario({ usuario, token }: { usuario: any, token: string }) {
  return <Perfil usuario={usuario} token={token} />
}

function Perfil({ usuario, token }: { usuario: Usuario, token: string }) {
  const { cerrarSesion } = useSesion()
  const router = useRouter()

  const [name, setName] = useState(usuario.name)
  const [email, setEmail] = useState(usuario.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  const [actualizar, { loading: guardando }] = useMutation(UPDATE_USER)
  const [eliminar, { loading: eliminando }] = useMutation(DELETE_USER)

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setGuardado(false)
    if (name.trim() !== usuario.name && !REGLA_NOMBRE.test(name.trim())) {
      setError('El nombre debe tener entre 3 y 50 caracteres y solo contener letras y espacios.')
      return
    }
    if (password && !REGLA_PASSWORD.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.')
      return
    }
    // Solo se envía lo que cambió.
    const input: { name?: string; email?: string; password?: string } = {}
    if (name.trim() !== usuario.name) input.name = name.trim()
    if (email.trim() !== usuario.email) input.email = email.trim()
    if (password) input.password = password
    if (Object.keys(input).length === 0) {
      setError('No hay cambios para guardar.')
      return
    }
    try {
      await actualizar({ variables: { input } })
      setPassword('')
      setGuardado(true)
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  async function borrarCuenta() {
    setError(null)
    try {
      const { data } = await eliminar()
      if (data?.deleteUser) {
        router.replace('/')
        cerrarSesion()
      }
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }

  return (
    <div className="perfil">
      <aside className="perfil__resumen" aria-label="Resumen de tu cuenta">
        <Avatar nombre={usuario.name} grande />
        <p className="perfil__nombre">{usuario.name}</p>
        <p className="perfil__correo">{usuario.email}</p>
        <p className="categoria">Miembro desde {formatearFecha(usuario.createdAt)}</p>
        <SaldoResumen />
      </aside>

      <section className="perfil__principal">
        <h1>Mi perfil</h1>

        <h2>Editar mis datos</h2>
        <form className="formulario" onSubmit={guardar}>
          <label htmlFor="perfil-nombre">Nombre</label>
          <input
            id="perfil-nombre"
            required
            value={name}
            onChange={(evento) => setName(evento.target.value)}
          />
          <label htmlFor="perfil-email">Correo</label>
          <input
            id="perfil-email"
            type="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
          <label htmlFor="perfil-password">Contraseña nueva (opcional)</label>
          <input
            id="perfil-password"
            type="password"
            autoComplete="new-password"
            placeholder="Déjala vacía para conservar la actual"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
          />
          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {guardado && (
            <p role="status" className="mensaje-ok">
              Tus datos quedaron guardados.
            </p>
          )}
          {error && (
            <p role="alert" className="mensaje-error">
              {error}
            </p>
          )}
        </form>

        <h2>Eliminar cuenta</h2>
        <p className="nota">Se borra tu cuenta y se cierra la sesión.</p>
        {confirmandoBorrado ? (
          <div className="zona-peligro">
            <p>¿Seguro? Esta acción no se puede deshacer.</p>
            <button type="button" onClick={() => void borrarCuenta()} disabled={eliminando}>
              Sí, eliminar mi cuenta
            </button>{' '}
            <button type="button" className="boton-secundario" onClick={() => setConfirmandoBorrado(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="boton-peligro" onClick={() => setConfirmandoBorrado(true)}>
            Eliminar mi cuenta
          </button>
        )}
      </section>
    </div>
  )
}
