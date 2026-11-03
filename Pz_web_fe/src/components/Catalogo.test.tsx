// Listado de piezas (lo que dibuja el servidor con los artículos que trae el gateway).
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ItemSummary } from '../api/items'
import { Catalogo, elegirDestacado } from './Catalogo'

function pieza(id: string, nombre: string, auction: ItemSummary['auction']): ItemSummary {
  return { id, name: nombre, description: `Descripción de ${nombre}`, category: 'Arte', images: [], basePrice: 80000, auction }
}

const abierta = (id: string, endsAt: string) => ({ id, currentPrice: 150000, status: 'OPEN' as const, endsAt })

const reloj = pieza('1', 'Reloj antiguo', abierta('a1', '2026-11-10T15:00:00Z'))
const collar = pieza('2', 'Collar de perlas', abierta('a2', '2026-11-05T15:00:00Z'))
const lampara = pieza('3', 'Lámpara de bronce', { id: 'a3', currentPrice: 90000, status: 'CLOSED', endsAt: '2026-10-01T15:00:00Z' })
const pintura = pieza('4', 'Pintura al óleo', null)

describe('elegirDestacado', () => {
  it('elige la subasta abierta que cierra primero', () => {
    expect(elegirDestacado([reloj, lampara, collar])?.id).toBe('2')
  })

  it('no elige nada si no hay subastas abiertas', () => {
    expect(elegirDestacado([lampara, pintura])).toBeNull()
  })
})

describe('Catalogo', () => {
  it('pone en grande la pieza que cierra primero y el resto en tarjetas', () => {
    render(<Catalogo items={[reloj, collar, lampara, pintura]} busqueda="" />)

    const destacado = screen.getByRole('region', { name: 'Collar de perlas' })
    expect(within(destacado).getByText('Cierra pronto')).toBeInTheDocument()
    expect(within(destacado).getByText('Descripción de Collar de perlas')).toBeInTheDocument()
    expect(within(destacado).getByRole('link', { name: 'Ver la subasta y pujar' })).toHaveAttribute('href', '/items/2')

    const resto = screen.getByRole('region', { name: 'Más piezas' })
    expect(within(resto).getAllByRole('listitem')).toHaveLength(3)
    expect(within(resto).getByRole('link', { name: 'Reloj antiguo' })).toHaveAttribute('href', '/items/1')
  })

  it('muestra precio y estado de cada tarjeta', () => {
    render(<Catalogo items={[lampara, pintura]} busqueda="" />)
    const [tarjetaLampara, tarjetaPintura] = screen.getAllByRole('listitem')
    expect(tarjetaLampara).toHaveTextContent('Cerrada')
    expect(tarjetaLampara).toHaveTextContent('Precio actual$ 90.000')
    expect(tarjetaPintura).toHaveTextContent('Sin subasta')
    expect(tarjetaPintura).toHaveTextContent('Precio base$ 80.000')
  })

  it('con búsqueda no destaca ninguna pieza y titula los resultados', () => {
    render(<Catalogo items={[reloj, collar]} busqueda="perlas" />)
    expect(screen.queryByText('Cierra pronto')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultados para «perlas»' })).toBeInTheDocument()
  })

  it('avisa cuando no hay piezas', () => {
    render(<Catalogo items={[]} busqueda="" />)
    expect(screen.getByText(/Todavía no hay piezas en subasta/)).toBeInTheDocument()
  })

  it('avisa cuando la búsqueda no encontró nada', () => {
    render(<Catalogo items={[]} busqueda="jarrón" />)
    expect(screen.getByText(/No hay piezas que coincidan con «jarrón»/)).toBeInTheDocument()
  })
})
