with open('Pz_web_fe/src/app/billetera/page.tsx', 'r') as f:
    content = f.read()

replacement = """import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { consultarGateway } from '@/lib/gateway'
import { WALLET } from '@/api/billetera'
import { BilleteraUsuario } from '@/components/BilleteraUsuario'

export const metadata: Metadata = { title: 'Mi billetera · Pujaz' }

export default async function BilleteraPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('pujaz_token')?.value;

  if (!token) {
    redirect('/login?desde=/billetera');
  }

  try {
    const data = await consultarGateway(WALLET, {}, token);
    return <BilleteraUsuario wallet={data.wallet} token={token} />;
  } catch (error) {
    // Si el token es inválido
    redirect('/login?desde=/billetera');
  }
}
"""

with open('Pz_web_fe/src/app/billetera/page.tsx', 'w') as f:
    f.write(replacement)
