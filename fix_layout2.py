with open('Pz_web_fe/src/app/layout.tsx', 'r') as f:
    content = f.read()

content = content.replace("""export default async function RootLayout({ children }: LayoutProps<'/'>) {
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
    <html lang="es">
      <body>
        <Proveedores usuario={usuario}>
          <Encabezado />
          <main className="layout-main">{children}</main>
        </Proveedores>
      </body>
    </html>
  )
}""", """import { Suspense } from 'react';

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
    </Proveedores>
  )
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es">
      <body>
        <Suspense fallback={<div>Cargando...</div>}>
          <SessionWrapper>{children}</SessionWrapper>
        </Suspense>
      </body>
    </html>
  )
}""")

with open('Pz_web_fe/src/app/layout.tsx', 'w') as f:
    f.write(content)
