// Publicar: crea el artículo y lleva a su detalle, o muestra el error del servidor.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { GraphQLError } from 'graphql'
import { describe, expect, it } from 'vitest'
import { CREATE_ITEM, type ItemSummary } from '../api/items'
import { navegacion } from '../test/navegacion'
import { ana, renderConSesion } from '../test/render'
import { FormularioPublicar } from './FormularioPublicar'

const nuevo = {
  __typename: 'Item',
  id: '2',
  name: 'Lámpara de bronce',
  description: null,
  category: null,
  images: [],
  basePrice: 80000,
  auction: null,
} as unknown as ItemSummary

function llenarYEnviar() {
  fireEvent.change(screen.getByLabelText('Nombre del artículo'), { target: { value: 'Lámpara de bronce' } })
  fireEvent.change(screen.getByLabelText('Precio base de subasta ($ COP)'), { target: { value: '80000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Publicar artículo' }))
}

describe('FormularioPublicar', () => {
  it('publica el artículo y va a su detalle', async () => {
    renderConSesion(<FormularioPublicar />, {
      ruta: '/publicar',
      conSesion: ana,
      mocks: [
        {
          request: {
            query: CREATE_ITEM,
            variables: { input: { name: 'Lámpara de bronce', images: [], basePrice: 80000 } },
          },
          result: { data: { createItem: nuevo } },
        },
      ],
    })
    llenarYEnviar()
    await waitFor(() => expect(navegacion.push).toHaveBeenCalledWith('/items/2'))
  })

  it('muestra el error del servidor y se queda en el formulario', async () => {
    renderConSesion(<FormularioPublicar />, {
      ruta: '/publicar',
      conSesion: ana,
      mocks: [
        {
          request: { query: CREATE_ITEM, variables: () => true },
          result: { errors: [new GraphQLError('El precio base es muy bajo')] },
        },
      ],
    })
    llenarYEnviar()

    expect(await screen.findByRole('alert')).toHaveTextContent('El precio base es muy bajo')
    expect(navegacion.push).not.toHaveBeenCalled()
  })
})
