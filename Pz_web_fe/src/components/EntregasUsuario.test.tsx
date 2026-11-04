// Mis entregas: lista, estado y confirmación de la entrega.
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CONFIRM_DELIVERY, MY_DELIVERIES } from '../api/entregas'
import { ana, renderConSesion } from '../test/render'
import { EntregasUsuario } from './EntregasUsuario'

const entrega = {
  __typename: 'Delivery',
  id: 'd1',
  amount: 150000,
  status: 'PENDING',
  createdAt: '2026-11-02T20:00:00Z',
  confirmedAt: null,
  auction: { __typename: 'Auction', id: '12', item: { __typename: 'Item', id: '64f1', name: 'Tocadiscos de 1970' } },
}

const pedirEntregas = (entregas: unknown[]) => ({
  request: { query: MY_DELIVERIES },
  result: { data: { myDeliveries: entregas } },
})

describe('EntregasUsuario', () => {
  it('avisa cuando todavía no hay entregas', async () => {
    renderConSesion(<EntregasUsuario />, { ruta: '/perfil', conSesion: ana, mocks: [pedirEntregas([])] })
    expect(await screen.findByText(/Aún no tienes entregas/)).toBeInTheDocument()
  })

  it('muestra la pieza ganada y deja confirmar que llegó', async () => {
    renderConSesion(<EntregasUsuario />, {
      ruta: '/perfil',
      conSesion: ana,
      mocks: [
        pedirEntregas([entrega]),
        {
          request: { query: CONFIRM_DELIVERY, variables: { id: 'd1' } },
          result: {
            data: {
              confirmDelivery: { __typename: 'Delivery', id: 'd1', status: 'CONFIRMED', confirmedAt: '2026-11-03T15:00:00Z' },
            },
          },
        },
      ],
    })

    expect(await screen.findByRole('link', { name: 'Tocadiscos de 1970' })).toHaveAttribute('href', '/items/64f1')
    expect(screen.getByText('Pendiente de recibir')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ya la recibí' }))

    expect(await screen.findByText(/^Recibida/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ya la recibí' })).not.toBeInTheDocument()
  })
})
