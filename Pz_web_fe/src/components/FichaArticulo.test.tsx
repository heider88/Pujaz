// Detalle de un artículo (lo que dibuja el servidor con la ficha que trae el gateway).
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ItemDetail } from '../api/items'
import { mockSuscripcion, reloj, subastaReloj } from '../test/datos'
import { renderConSesion } from '../test/render'
import { ArticuloNoEncontrado, FichaArticulo } from './FichaArticulo'

function renderFicha(item: ItemDetail) {
  renderConSesion(<FichaArticulo item={item} />, { ruta: `/items/${item.id}`, mocks: [mockSuscripcion(subastaReloj)] })
}

describe('FichaArticulo', () => {
  it('muestra los datos del artículo y su subasta', () => {
    renderFicha(reloj)
    expect(screen.getByRole('heading', { level: 1, name: 'Reloj antiguo' })).toBeInTheDocument()
    expect(screen.getByText('Reloj de bolsillo de 1920, funciona.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Reloj antiguo, imagen 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Documento 1' })).toHaveAttribute(
      'href',
      'https://ejemplo.com/certificado.pdf',
    )
    expect(screen.getByRole('region', { name: 'Subasta' })).toHaveTextContent('Estado: Abierta')
  })

  it('cambia de foto al elegir una miniatura', () => {
    renderFicha({
      ...reloj,
      images: ['https://ejemplo.com/frente.jpg', 'https://ejemplo.com/maquina.jpg', 'https://ejemplo.com/tapa.jpg'],
    })
    expect(screen.getByRole('img', { name: 'Reloj antiguo, imagen 1' })).toHaveAttribute(
      'src',
      'https://ejemplo.com/frente.jpg',
    )
    expect(screen.getAllByRole('button', { name: /Ver imagen/ })).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Ver imagen 2' }))
    expect(screen.getByRole('img', { name: 'Reloj antiguo, imagen 2' })).toHaveAttribute(
      'src',
      'https://ejemplo.com/maquina.jpg',
    )
  })

  it('avisa si el artículo todavía no tiene subasta', () => {
    renderFicha({ ...reloj, auction: null })
    expect(screen.getByRole('region', { name: 'Subasta' })).toHaveTextContent(
      'Este artículo todavía no tiene subasta.',
    )
  })

  it('muestra «Artículo no encontrado»', () => {
    renderConSesion(<ArticuloNoEncontrado />)
    expect(screen.getByRole('heading', { name: 'Artículo no encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a las subastas' })).toHaveAttribute('href', '/')
  })
})
