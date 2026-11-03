// Menú: cambia según haya sesión o no, marca la página actual y permite cerrar sesión.
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { navegacion } from '../test/navegacion'
import { ana, renderConSesion } from '../test/render'
import { Encabezado } from './Encabezado'

describe('Encabezado', () => {
  it('sin sesión muestra el menú con "Iniciar sesión"', () => {
    renderConSesion(<Encabezado />)
    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mi billetera' })).not.toBeInTheDocument()
  })

  it('marca la página actual', () => {
    renderConSesion(<Encabezado />, { ruta: '/login' })
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Subastas' })).not.toHaveAttribute('aria-current')
  })

  it('con sesión muestra el nombre, la billetera y permite cerrar sesión', async () => {
    renderConSesion(<Encabezado />, { conSesion: ana })
    expect(await screen.findByText('Hola, Ana Gómez')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mi billetera' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(localStorage.getItem('pujaz_token')).toBeNull()
    expect(navegacion.push).toHaveBeenCalledWith('/')
  })
})
