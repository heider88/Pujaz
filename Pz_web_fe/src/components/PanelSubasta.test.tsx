// Panel de subasta: estado inicial que manda el servidor, tiempo real y formulario de puja.
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WALLET } from '../api/billetera'
import { PLACE_BID, type AuctionDetail } from '../api/items'
import { mockSuscripcion, subastaReloj } from '../test/datos'
import { ana, renderConSesion } from '../test/render'
import type { MockLink } from '@apollo/client/testing'
import { PanelSubasta } from './PanelSubasta'

function renderPanel(mocks: MockLink.MockedResponse[], conSesion = false, subasta = subastaReloj) {
  renderConSesion(<PanelSubasta subasta={subasta} />, {
    ruta: '/items/1',
    mocks,
    conSesion: conSesion ? ana : undefined,
  })
  return within(screen.getByRole('region', { name: 'Subasta' }))
}

function pujar(monto: string) {
  fireEvent.change(screen.getByLabelText('Tu oferta (COP)'), { target: { value: monto } })
  fireEvent.click(screen.getByRole('button', { name: 'Pujar' }))
}

function errorDePuja(monto: number, codigo: string): MockLink.MockedResponse {
  return {
    request: { query: PLACE_BID, variables: { auctionId: 'a1', amount: monto } },
    result: { errors: [{ message: 'error', extensions: { code: codigo } }] },
  }
}

describe('PanelSubasta', () => {
  it('muestra precio actual, quién va ganando y los participantes', () => {
    const p = renderPanel([mockSuscripcion(subastaReloj)])
    expect(p.getByText(/Precio actual/)).toHaveTextContent('$ 150.000')
    expect(p.getByText('Luis Pérez', { selector: 'strong' })).toBeInTheDocument()
    expect(p.getByRole('list', { name: 'Participantes' })).toHaveTextContent('Luis Pérez')
  })

  it('se actualiza en tiempo real cuando llega una puja nueva', async () => {
    const despuesDeLaPuja = {
      ...subastaReloj,
      currentPrice: 200000,
      winningBid: {
        ...subastaReloj.winningBid!,
        id: 'b2',
        amount: 200000,
        bidder: { __typename: 'Bidder', id: '12', name: 'Marta Ruiz' },
      },
      participants: [
        ...subastaReloj.participants,
        { __typename: 'Bidder', id: '12', name: 'Marta Ruiz' },
      ],
    } as unknown as AuctionDetail

    const p = renderPanel([mockSuscripcion(despuesDeLaPuja, 30)])
    expect(p.getByText('Luis Pérez', { selector: 'strong' })).toBeInTheDocument()

    expect(await p.findByText('Marta Ruiz', { selector: 'strong' })).toBeInTheDocument()
    expect(p.getByText(/Precio actual/)).toHaveTextContent('$ 200.000')
    expect(p.getByRole('list', { name: 'Participantes' })).toHaveTextContent('Marta Ruiz')
    expect(p.getByRole('list', { name: 'Actividad reciente' })).toHaveTextContent('Luis Pérez')
  })

  it('sin sesión invita a iniciar sesión para pujar y vuelve a esta subasta', () => {
    const p = renderPanel([mockSuscripcion(subastaReloj)])
    expect(p.getByRole('link', { name: 'Inicia sesión para pujar' })).toHaveAttribute(
      'href',
      '/login?desde=%2Fitems%2F1',
    )
    expect(p.queryByRole('button', { name: 'Pujar' })).not.toBeInTheDocument()
  })

  it('con sesión registra la puja y actualiza el precio', async () => {
    const p = renderPanel(
      [
        mockSuscripcion(subastaReloj),
        {
          request: { query: PLACE_BID, variables: { auctionId: 'a1', amount: 180000 } },
          result: {
            data: {
              placeBid: {
                __typename: 'Bid',
                id: 'b9',
                amount: 180000,
                createdAt: '2026-10-10T16:00:00Z',
                bidder: { __typename: 'Bidder', id: ana.id, name: ana.name },
              },
            },
          },
        },
      ],
      true,
    )
    await p.findByRole('button', { name: 'Pujar' })
    pujar('180000')

    expect(await p.findByRole('status')).toHaveTextContent('Tu puja de $ 180.000 quedó registrada.')
    expect(p.getByText('Vas ganando esta subasta.')).toBeInTheDocument()
    expect(p.getByText(/Precio actual/)).toHaveTextContent('$ 180.000')
    expect(p.getByRole('list', { name: 'Participantes' })).toHaveTextContent('Ana Gómez')
  })

  it.each([
    ['BID_TOO_LOW', 'Tu oferta debe superar el precio actual por al menos 100 COP.'],
    ['INSUFFICIENT_FUNDS', 'No tienes saldo disponible suficiente.'],
    ['AUCTION_CLOSED', 'Esta subasta ya terminó.'],
  ])('muestra el error %s', async (codigo, mensaje) => {
    const p = renderPanel([mockSuscripcion(subastaReloj), errorDePuja(160000, codigo)], true)
    await p.findByRole('button', { name: 'Pujar' })
    pujar('160000')
    expect(await p.findByRole('alert')).toHaveTextContent(mensaje)
  })

  it('muestra el saldo disponible y avisa si la oferta lo supera', async () => {
    const billetera = {
      request: { query: WALLET },
      result: {
        data: {
          wallet: { __typename: 'Wallet', userId: ana.id, available: 200000, reserved: 0, movements: [] },
        },
      },
      maxUsageCount: 5,
    }
    const p = renderPanel([mockSuscripcion(subastaReloj), billetera], true)
    expect(await p.findByText('Tu saldo disponible')).toHaveTextContent('$ 200.000')
    expect(p.getByRole('link', { name: 'Recargar' })).toHaveAttribute('href', '/billetera')

    fireEvent.change(p.getByLabelText('Tu oferta (COP)'), { target: { value: '250000' } })
    expect(p.getByText('Tu oferta supera tu saldo disponible.')).toBeInTheDocument()
  })

  it('si la subasta está cerrada no deja pujar', async () => {
    const cerrada = { ...subastaReloj, status: 'CLOSED' } as unknown as AuctionDetail
    const p = renderPanel([mockSuscripcion(cerrada)], true, cerrada)
    expect(await p.findByText('Esta subasta ya terminó: no recibe más pujas.')).toBeInTheDocument()
    expect(p.queryByRole('button', { name: 'Pujar' })).not.toBeInTheDocument()
  })
})
