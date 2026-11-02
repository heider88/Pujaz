// Layout raíz (Server Component): el HTML común de todas las páginas.
// El encabezado depende de la sesión del navegador, así que es un Client Component dentro de él.
import type { Metadata } from 'next'
// Tipografías servidas desde la propia app (sin depender de Google Fonts).
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import './globals.css'
import { cookies } from 'next/headers'
import { consultarGateway } from '@/lib/gateway'
import { ME } from '@/api/usuarios'
import { Encabezado } from '@/components/Encabezado'
import { Proveedores } from '@/components/Proveedores'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Pujaz, casa de subastas',
  description: 'Pujaz, casa de subastas en línea',
}

async function SessionWrapper({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('pujaz_token')?.value;
  let usuario = null;
  if (token) {
    try {
      const data = await consultarGateway(ME, {}, token);
      usuario = data.me;
    } catch {
      // Token inválido o servidor caído
    }
  }

  return (
    <Proveedores usuario={usuario}>
      <Encabezado />
      <main className="layout-main">{children}</main>
      <footer className="pie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/emblema.png" alt="" width={240} height={192} />
        <div>
          <p className="pie__marca">Pujaz, casa de subastas en línea</p>
          <p>Proyecto del equipo 1C para Arquitectura de Software, Universidad Nacional de Colombia, 2026-II.</p>
        </div>
      </footer>
    </Proveedores>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Suspense fallback={<div>Cargando...</div>}>
          <SessionWrapper>{children}</SessionWrapper>
        </Suspense>
      </body>
    </html>
  )
}
