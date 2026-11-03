// Publicar artículo (exige sesión y rol de vendedor).
import type { Metadata } from 'next'
import { FormularioPublicar } from '@/components/FormularioPublicar'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { consultarGateway } from '@/lib/gateway'
import { ME } from '@/api/usuarios'

export const metadata: Metadata = { title: 'Publicar artículo · Pujaz' }

export default async function PublicarPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('pujaz_token')?.value
  
  if (!token) {
    redirect('/login?desde=%2Fpublicar')
  }

  try {
    const data = await consultarGateway(ME, {}, token)
    if (!data.me || data.me.role !== 'vendedor') {
      redirect('/')
    }
  } catch {
    redirect('/login?desde=%2Fpublicar')
  }

  return <FormularioPublicar />
}
