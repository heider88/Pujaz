with open('Pz_web_fe/src/app/layout.tsx', 'r') as f:
    content = f.read()

import_str = "import { cookies } from 'next/headers'\nimport { consultarGateway } from '@/lib/gateway'\nimport { ME } from '@/api/usuarios'\n"

content = content.replace("import { Encabezado } from '@/components/Encabezado'", import_str + "import { Encabezado } from '@/components/Encabezado'")

root_layout_new = """export default async function RootLayout({ children }: LayoutProps<'/'>) {
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
}
"""

content = content.replace("export default function RootLayout({ children }: LayoutProps<'/'>) {\n  return (\n    <html lang=\"es\">\n      <body>\n        <Proveedores>\n          <Encabezado />\n          <main className=\"layout-main\">{children}</main>\n        </Proveedores>\n      </body>\n    </html>\n  )\n}", root_layout_new)

with open('Pz_web_fe/src/app/layout.tsx', 'w') as f:
    f.write(content)
