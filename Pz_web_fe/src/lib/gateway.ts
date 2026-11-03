// Consultas al gateway desde el servidor de Next.js (Server Components).
// Usa la red interna: en Docker, GATEWAY_URL=http://pz-api-ag:4000/graphql.
// Es el mismo contrato GraphQL que usa el navegador: la SPA y el servidor no conocen a los
// microservicios, solo al gateway (regla de capas y patrón API Gateway).
import 'server-only'
import type { TypedDocumentNode } from '@apollo/client'
import { print } from 'graphql'
import type { CodigoError } from '@/api/errores'

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:4000/graphql'

// Error del gateway con su código del contrato (errors[].extensions.code).
export class ErrorGateway extends Error {
  constructor(
    message: string,
    readonly codigo: CodigoError | null,
  ) {
    super(message)
    this.name = 'ErrorGateway'
  }
}

interface RespuestaGraphQL<T> {
  data?: T
  errors?: { message: string; extensions?: { code?: string } }[]
}

export async function consultarGateway<T, V extends Record<string, unknown>>(
  documento: TypedDocumentNode<T, V>,
  variables: V,
  token?: string,
): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: print(documento), variables }),
      // Precios y estados cambian a cada puja: nunca se guarda en caché.
      cache: 'no-store',
    })
  } catch {
    throw new ErrorGateway('No se pudo conectar con el gateway.', null)
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaGraphQL<T>
  if (cuerpo.errors?.length) {
    const [primero] = cuerpo.errors
    const codigo = primero.extensions?.code
    throw new ErrorGateway(primero.message, typeof codigo === 'string' ? (codigo as CodigoError) : null)
  }
  if (!respuesta.ok || !cuerpo.data) {
    throw new ErrorGateway(`El gateway respondió ${respuesta.status}.`, null)
  }
  return cuerpo.data
}
