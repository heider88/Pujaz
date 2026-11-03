with open('Pz_web_fe/src/app/perfil/page.tsx', 'r') as f:
    content = f.read()

replacement = """import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { consultarGateway } from '@/lib/gateway'
import { ME } from '@/api/usuarios'
import { PerfilUsuario } from '@/components/PerfilUsuario'

export const metadata: Metadata = { title: 'Mi perfil · Pujaz' }

export default async function PerfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('pujaz_token')?.value;

  if (!token) {
    redirect('/login?desde=/perfil');
  }

  try {
    const data = await consultarGateway(ME, {}, token);
    return <PerfilUsuario usuario={data.me} token={token} />;
  } catch (error) {
    redirect('/login?desde=/perfil');
  }
}
"""

with open('Pz_web_fe/src/app/perfil/page.tsx', 'w') as f:
    f.write(replacement)
