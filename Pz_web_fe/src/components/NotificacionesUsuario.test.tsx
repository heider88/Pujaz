// Mis notificaciones: lista con su etiqueta y la subasta relacionada.
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MY_NOTIFICATIONS } from '../api/notificaciones'
import { ana, renderConSesion } from '../test/render'
import { NotificacionesUsuario } from './NotificacionesUsuario'

describe('NotificacionesUsuario', () => {
  it('muestra cada aviso con su etiqueta y el enlace a la pieza', async () => {
    renderConSesion(<NotificacionesUsuario />, {
      ruta: '/perfil',
      conSesion: ana,
      mocks: [
        {
          request: { query: MY_NOTIFICATIONS },
          result: {
            data: {
              myNotifications: [
                {
                  __typename: 'Notification',
                  id: 'n2',
                  type: 'OUTBID',
                  message: 'Tu puja ha sido superada',
                  createdAt: '2026-11-03T14:00:00Z',
                  auction: { __typename: 'Auction', id: '12', item: { __typename: 'Item', id: '64f1', name: 'Tocadiscos de 1970' } },
                },
                {
                  __typename: 'Notification',
                  id: 'n1',
                  type: 'WELCOME',
                  message: '¡Bienvenido a Pujaz!',
                  createdAt: '2026-11-01T12:00:00Z',
                  auction: null,
                },
              ],
            },
          },
        },
      ],
    })

    expect(await screen.findByText('Puja superada:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tocadiscos de 1970' })).toHaveAttribute('href', '/items/64f1')
    expect(screen.getByText('Bienvenida:')).toBeInTheDocument()
  })

  it('avisa cuando no hay notificaciones', async () => {
    renderConSesion(<NotificacionesUsuario />, {
      ruta: '/perfil',
      conSesion: ana,
      mocks: [{ request: { query: MY_NOTIFICATIONS }, result: { data: { myNotifications: [] } } }],
    })
    expect(await screen.findByText('No tienes notificaciones todavía.')).toBeInTheDocument()
  })
})
