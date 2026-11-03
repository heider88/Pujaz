// Consultas del servidor al gateway: devuelve los datos o un error con el código del contrato.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET_ITEMS } from '../api/items'
import { consultarGateway, ErrorGateway } from './gateway'

function responder(cuerpo: unknown, status = 200) {
  const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('consultarGateway', () => {
  it('manda la consulta con sus variables y devuelve data', async () => {
    const fetchFalso = responder({ data: { items: [] } })
    await expect(consultarGateway(GET_ITEMS, { search: 'reloj' })).resolves.toEqual({ items: [] })

    const [url, opciones] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://localhost:4000/graphql')
    const cuerpo = JSON.parse(opciones.body)
    expect(cuerpo.query).toContain('items(search: $search)')
    expect(cuerpo.variables).toEqual({ search: 'reloj' })
    expect(opciones.headers.Authorization).toBeUndefined()
  })

  it('agrega el JWT cuando se pasa', async () => {
    const fetchFalso = responder({ data: { items: [] } })
    await consultarGateway(GET_ITEMS, { search: null }, 'jwt')
    expect(fetchFalso.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt')
  })

  it('convierte errors[] en ErrorGateway con el código del contrato', async () => {
    responder({ errors: [{ message: 'Sin sesión', extensions: { code: 'UNAUTHENTICATED' } }] })
    await expect(consultarGateway(GET_ITEMS, { search: null })).rejects.toMatchObject({
      name: 'ErrorGateway',
      codigo: 'UNAUTHENTICATED',
    })
  })

  it('si el gateway no responde lanza ErrorGateway sin código', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const error = await consultarGateway(GET_ITEMS, { search: null }).catch((e) => e)
    expect(error).toBeInstanceOf(ErrorGateway)
    expect(error.codigo).toBeNull()
  })
})
