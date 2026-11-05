// Registro: crea la cuenta e inicia sesión, o muestra el error.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { REGISTER } from '../api/usuarios'
import { cookieSesion, navegacion } from '../test/navegacion'
import { ana, renderConSesion } from '../test/render'
import { FormularioRegistro } from './FormularioRegistro'

function llenarYEnviar(password = 'Secreto123') {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Gómez' } })
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@correo.com' } })
  fireEvent.change(screen.getByLabelText('Contraseña (mínimo 8 caracteres, con mayúscula y número)'), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

const pedido = {
  query: REGISTER,
  variables: { input: { name: 'Ana Gómez', email: 'ana@correo.com', password: 'Secreto123', role: 'comprador' } },
}

describe('FormularioRegistro', () => {
  it('crea la cuenta, inicia sesión y va a las subastas', async () => {
    renderConSesion(<FormularioRegistro />, {
      ruta: '/registro',
      mocks: [{ request: pedido, result: { data: { register: { __typename: 'AuthPayload', token: 'jwt-ana', user: ana } } } }],
    })
    llenarYEnviar()
    await waitFor(() => expect(navegacion.replace).toHaveBeenCalledWith('/'))
    expect(cookieSesion.poner).toHaveBeenCalledWith('jwt-ana')
  })

  it('envía el rol de vendedor si se elige «Vender»', async () => {
    const comoVendedor = { ...pedido, variables: { input: { ...pedido.variables.input, role: 'vendedor' } } }
    renderConSesion(<FormularioRegistro />, {
      ruta: '/registro',
      mocks: [{ request: comoVendedor, result: { data: { register: { __typename: 'AuthPayload', token: 'jwt-v', user: ana } } } }],
    })
    expect(screen.getByRole('radio', { name: /Comprar/ })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /Vender/ }))
    llenarYEnviar()
    await waitFor(() => expect(cookieSesion.poner).toHaveBeenCalledWith('jwt-v'))
  })

  it('avisa si el correo ya está registrado', async () => {
    renderConSesion(<FormularioRegistro />, {
      ruta: '/registro',
      mocks: [{ request: pedido, result: { errors: [{ message: 'Correo en uso', extensions: { code: 'EMAIL_TAKEN' } }] } }],
    })
    llenarYEnviar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese correo.')
  })

  it('no envía una contraseña de menos de 8 caracteres', async () => {
    renderConSesion(<FormularioRegistro />, { ruta: '/registro' })
    llenarYEnviar('corta')
    expect(await screen.findByRole('alert')).toHaveTextContent('al menos 8 caracteres')
  })
})
