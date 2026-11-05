// Ayudas para las pruebas: monta un componente con un gateway simulado (MockedProvider),
// la sesión y la ruta indicada.
import type { MockLink } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ME, type Usuario } from '../api/usuarios'
import { SessionProvider } from '../session/SessionProvider'
import { irA } from './navegacion'

export const ana: Usuario = {
  __typename: 'User',
  id: '7',
  name: 'Ana Gómez',
  email: 'ana@correo.com',
  role: 'comprador',
  createdAt: '2026-10-01T12:00:00Z',
} as unknown as Usuario

// Respuesta de `me` para simular una sesión iniciada.
export function mockMe(usuario: Usuario = ana): MockLink.MockedResponse {
  return { request: { query: ME }, result: { data: { me: usuario } } }
}

interface Opciones {
  ruta?: string
  // Lo que va después de "?" en la URL, por ejemplo "desde=/perfil".
  busqueda?: string
  mocks?: MockLink.MockedResponse[]
  // Si se pasa, la sesión arranca con este usuario (como si el servidor lo hubiera leído de la cookie).
  conSesion?: Usuario
}

export function renderConSesion(
  ui: ReactNode,
  { ruta = '/', busqueda = '', mocks = [], conSesion }: Opciones = {},
) {
  irA(ruta, busqueda)
  const todos = [...mocks]
  if (conSesion) todos.unshift(mockMe(conSesion))
  return render(
    <MockedProvider mocks={todos}>
      <SessionProvider usuarioInicial={conSesion ?? null}>{ui}</SessionProvider>
    </MockedProvider>,
  )
}
