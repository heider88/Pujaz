// Pruebas del detalle: muestra los datos, el artículo inexistente y el error.
import { MockedProvider } from '@apollo/client/testing/react'
import type { MockLink } from '@apollo/client/testing'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { GET_ITEM, type ItemDetail } from '../api/items'
import { DetallePage } from './DetallePage'

const reloj = {
  __typename: 'Item',
  id: '1',
  name: 'Reloj antiguo',
  description: 'Reloj de bolsillo de 1920, funciona.',
  category: 'Relojería',
  images: ['https://ejemplo.com/reloj.jpg'],
  documents: ['https://ejemplo.com/certificado.pdf'],
  basePrice: 100000,
  auction: {
    __typename: 'Auction',
    id: 'a1',
    currentPrice: 150000,
    status: 'OPEN',
    endsAt: '2026-10-20T15:00:00Z',
  },
} as ItemDetail

// Monta la página en /items/:id para que useParams lea el id.
function renderDetalle(id: string, mocks: MockLink.MockedResponse[]) {
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={[`/items/${id}`]}>
        <Routes>
          <Route path="/items/:id" element={<DetallePage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
}

describe('DetallePage', () => {
  it('muestra los datos del artículo y su subasta', async () => {
    renderDetalle('1', [
      { request: { query: GET_ITEM, variables: { id: '1' } }, result: { data: { item: reloj } } },
    ])

    expect(screen.getByText('Cargando artículo…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Reloj antiguo' })).toBeInTheDocument()
    expect(screen.getByText('Reloj de bolsillo de 1920, funciona.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Reloj antiguo, imagen 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Documento 1' })).toHaveAttribute(
      'href',
      'https://ejemplo.com/certificado.pdf',
    )
    expect(screen.getByRole('region', { name: 'Subasta' })).toHaveTextContent('Estado: Abierta')
  })

  it('avisa si el artículo no existe', async () => {
    renderDetalle('99', [
      { request: { query: GET_ITEM, variables: { id: '99' } }, result: { data: { item: null } } },
    ])
    expect(await screen.findByRole('heading', { name: 'Artículo no encontrado' })).toBeInTheDocument()
  })

  it('muestra un error si el Gateway falla', async () => {
    renderDetalle('1', [
      { request: { query: GET_ITEM, variables: { id: '1' } }, error: new Error('Gateway caído') },
    ])
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el artículo')
  })
})
