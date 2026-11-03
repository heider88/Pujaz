'use client'
// Lo que necesitan los Client Components: el cliente GraphQL (Apollo) y la sesión.
// El layout raíz (Server Component) envuelve todas las páginas con esto.
import { ApolloProvider } from '@apollo/client/react'
import { useState, type ReactNode } from 'react'
import { crearCliente } from '../api/client'
import { SessionProvider } from '../session/SessionProvider'

import type { Usuario } from '../api/usuarios'

export function Proveedores({ children, usuario }: { children: ReactNode, usuario: Usuario | null }) {
  // Un cliente por pestaña (y uno por petición al dibujar en el servidor).
  const [client] = useState(crearCliente)
  return (
    <ApolloProvider client={client}>
      <SessionProvider usuarioInicial={usuario}>{children}</SessionProvider>
    </ApolloProvider>
  )
}
