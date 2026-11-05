// Mi billetera (exige sesión). El servidor lee el JWT de la cookie y trae saldo y movimientos.
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { WALLET, type Billetera } from '@/api/billetera'
import { BilleteraUsuario } from '@/components/BilleteraUsuario'
import { consultarGateway } from '@/lib/gateway'

export const metadata: Metadata = { title: 'Mi billetera · Pujaz' }

export default async function BilleteraPage() {
  const token = (await cookies()).get('pujaz_token')?.value
  if (!token) redirect('/login?desde=%2Fbilletera')

  // redirect() funciona lanzando una excepción: por eso se llama fuera del try/catch.
  let billetera: Billetera | null = null
  try {
    billetera = (await consultarGateway(WALLET, {}, token)).wallet
  } catch {
    // Token vencido o inválido.
  }
  if (!billetera) redirect('/login?desde=%2Fbilletera')

  return <BilleteraUsuario wallet={billetera} />
}
