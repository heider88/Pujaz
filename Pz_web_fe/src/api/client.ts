// Cliente GraphQL de los Client Components (lo que corre en el navegador).
// - Queries y mutations van por HTTP a /graphql con el JWT.
// - Las subscriptions (tiempo real) van por WebSocket a /graphql.
// En Docker, Nginx reenvía /graphql al gateway (HTTP y WebSocket); en desarrollo, la parte HTTP
// la reenvía Next.js (rewrites en next.config.ts) y el WebSocket va directo al gateway.
//
// Las páginas que se dibujan en el servidor (listado y detalle) no usan este cliente:
// piden sus datos con src/lib/gateway.ts.
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { SetContextLink } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { OperationTypeNode } from 'graphql'
import { createClient } from 'graphql-ws'


function urlWebSocket(): string {
  const configurada = process.env.NEXT_PUBLIC_GATEWAY_WS_URL
  if (configurada) return configurada
  const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocolo}://${window.location.host}/graphql`
}

export function crearCliente(): ApolloClient {
  // Al dibujar en el servidor no hay ventana ni sesión del navegador: ese cliente no sale a la red.
  // Las queries de los Client Components se hacen al hidratar, ya en el navegador.
  if (typeof window === 'undefined') {
    return new ApolloClient({ ssrMode: true, link: ApolloLink.empty(), cache: new InMemoryCache() })
  }

  const httpLink = new HttpLink({ uri: '/graphql' })



  const wsLink = new GraphQLWsLink(createClient({ url: urlWebSocket() }))

  // Si la operación es una subscription, va por WebSocket; si no, por HTTP con el JWT.
  const link = ApolloLink.split(
    ({ query }) => {
      const definition = getMainDefinition(query)
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === OperationTypeNode.SUBSCRIPTION
      )
    },
    wsLink,
    httpLink,
  )

  return new ApolloClient({ link, cache: new InMemoryCache() })
}
