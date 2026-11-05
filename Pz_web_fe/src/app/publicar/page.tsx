// Publicar artículo (exige sesión y rol de vendedor).
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ME, type Usuario } from '@/api/usuarios'
import { FormularioPublicar } from '@/components/FormularioPublicar'
import { consultarGateway } from '@/lib/gateway'

export const metadata: Metadata = { title: 'Publicar artículo · Pujaz' }

export default async function PublicarPage() {
  const token = (await cookies()).get('pujaz_token')?.value
  if (!token) redirect('/login?desde=%2Fpublicar')

  // redirect() funciona lanzando una excepción: si se llama dentro del try, el catch la atrapa
  // y un comprador terminaba en /login en vez de volver al inicio. Por eso se decide afuera.
  let usuario: Usuario | null = null
  try {
    usuario = (await consultarGateway(ME, {}, token)).me
  } catch {
    // Token vencido o inválido.
  }
  if (!usuario) redirect('/login?desde=%2Fpublicar')
  if (usuario.role !== 'vendedor') redirect('/')

  return <FormularioPublicar />
}
