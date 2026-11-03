// Perfil: muestra los datos, guarda solo lo que cambió y elimina la cuenta.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DELETE_USER, UPDATE_USER } from '../api/usuarios'
import { navegacion } from '../test/navegacion'
import { ana, renderConSesion } from '../test/render'
import { Encabezado } from './Encabezado'
import { PerfilUsuario } from './PerfilUsuario'

describe('PerfilUsuario', () => {
  it('muestra los datos del usuario', async () => {
    renderConSesion(<PerfilUsuario usuario={ana} token="x" />, { ruta: '/perfil', conSesion: ana })
    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Gómez')
    expect(screen.getByLabelText('Correo')).toHaveValue('ana@correo.com')
  })

  it('guarda solo lo que cambió y el saludo del menú se actualiza', async () => {
    renderConSesion(
      <>
        <Encabezado />
        <PerfilUsuario usuario={ana} token="x" />
      </>,
      {
        ruta: '/perfil',
        conSesion: ana,
        mocks: [
          {
            request: { query: UPDATE_USER, variables: { input: { name: 'Ana María Gómez' } } },
            result: { data: { updateUser: { ...ana, name: 'Ana María Gómez' } } },
          },
        ],
      },
    )
    fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Ana María Gómez' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Tus datos quedaron guardados.')
    expect(await screen.findByText('Hola, Ana María Gómez')).toBeInTheDocument()
  })

  it('avisa si el correo nuevo ya lo usa otra cuenta', async () => {
    renderConSesion(<PerfilUsuario usuario={ana} token="x" />, {
      ruta: '/perfil',
      conSesion: ana,
      mocks: [
        {
          request: { query: UPDATE_USER, variables: { input: { email: 'luis@correo.com' } } },
          result: { errors: [{ message: 'Correo en uso', extensions: { code: 'EMAIL_TAKEN' } }] },
        },
      ],
    })
    fireEvent.change(await screen.findByLabelText('Correo'), { target: { value: 'luis@correo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe otra cuenta con ese correo.')
  })

  it('elimina la cuenta después de confirmar, cierra la sesión y va al inicio', async () => {
    renderConSesion(<PerfilUsuario usuario={ana} token="x" />, {
      ruta: '/perfil',
      conSesion: ana,
      mocks: [{ request: { query: DELETE_USER }, result: { data: { deleteUser: true } } }],
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar mi cuenta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar mi cuenta' }))

    await waitFor(() => expect(navegacion.replace).toHaveBeenCalledWith('/'))
    expect(localStorage.getItem('pujaz_token')).toBeNull()
  })
})
