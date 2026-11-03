// Inicio de sesión: entra, guarda el token y vuelve a la página de donde venía, o muestra el error.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LOGIN } from '../api/usuarios'
import { navegacion } from '../test/navegacion'
import { ana, renderConSesion } from '../test/render'
import { FormularioLogin } from './FormularioLogin'

function llenarYEnviar(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

const loginOk = {
  request: { query: LOGIN, variables: { email: 'ana@correo.com', password: 'Secreto123' } },
  result: { data: { login: { __typename: 'AuthPayload', token: 'jwt-nuevo', user: ana } } },
}

describe('FormularioLogin', () => {
  it('inicia sesión, guarda el token y vuelve a la página de donde venía', async () => {
    renderConSesion(<FormularioLogin />, { ruta: '/login', busqueda: 'desde=/billetera', mocks: [loginOk] })
    llenarYEnviar('ana@correo.com', 'Secreto123')

    await waitFor(() => expect(navegacion.replace).toHaveBeenCalledWith('/billetera'))
    expect(localStorage.getItem('pujaz_token')).toBe('jwt-nuevo')
  })

  it('sin ?desde= (o con una dirección de otro sitio) vuelve a las subastas', async () => {
    renderConSesion(<FormularioLogin />, { ruta: '/login', busqueda: 'desde=//otro-sitio.com', mocks: [loginOk] })
    llenarYEnviar('ana@correo.com', 'Secreto123')
    await waitFor(() => expect(navegacion.replace).toHaveBeenCalledWith('/'))
  })

  it('muestra un mensaje si el correo o la contraseña están mal', async () => {
    renderConSesion(<FormularioLogin />, {
      ruta: '/login',
      mocks: [
        {
          request: { query: LOGIN, variables: { email: 'ana@correo.com', password: 'Malamala1' } },
          result: {
            errors: [{ message: 'Credenciales inválidas', extensions: { code: 'INVALID_CREDENTIALS' } }],
          },
        },
      ],
    })
    llenarYEnviar('ana@correo.com', 'Malamala1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
    expect(localStorage.getItem('pujaz_token')).toBeNull()
  })
})
