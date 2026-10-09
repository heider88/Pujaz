// Prueba de ejemplo: copia este patrón para probar cada página.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from '../App'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('muestra el menú principal', () => {
    renderAt('/')
    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    expect(menu).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mi billetera' })).toBeInTheDocument()
  })

  it('muestra la página que corresponde a la URL', () => {
    renderAt('/billetera')
    expect(screen.getByRole('heading', { name: 'Mi billetera' })).toBeInTheDocument()
  })
})
