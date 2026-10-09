// Prueba de ejemplo: copia este patrón para probar cada página.
// MockedProvider reemplaza al Gateway: la página de inicio ya consulta los artículos.
import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { GET_ITEMS } from '../api/items'
import { App } from '../App'

const mocks = [
  { request: { query: GET_ITEMS, variables: { search: null } }, result: { data: { items: [] } } },
]

function renderAt(path: string) {
  render(
    <MockedProvider mocks={mocks}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MockedProvider>,
  )
}

describe('Layout', () => {
  it('muestra el menú principal', async () => {
    renderAt('/')
    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    expect(menu).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mi billetera' })).toBeInTheDocument()
    // Espera a que termine la consulta para no dejarla a medias.
    expect(await screen.findByText('Todavía no hay artículos en subasta.')).toBeInTheDocument()
  })

  it('muestra la página que corresponde a la URL', () => {
    renderAt('/billetera')
    expect(screen.getByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument()
  })
})
