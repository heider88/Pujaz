// Mi perfil (exige sesión). El servidor lee el JWT de la cookie y trae los datos con `me`.
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ME, type Usuario } from '@/api/usuarios'
import { PerfilUsuario } from '@/components/PerfilUsuario'
import { consultarGateway } from '@/lib/gateway'

export const metadata: Metadata = { title: 'Mi perfil · Pujaz' }

export default async function PerfilPage() {
  const token = (await cookies()).get('pujaz_token')?.value
  if (!token) redirect('/login?desde=%2Fperfil')

  // redirect() funciona lanzando una excepción: por eso se llama fuera del try/catch.
  let usuario: Usuario | null = null
  try {
    usuario = (await consultarGateway(ME, {}, token)).me
  } catch {
    // Token vencido o inválido.
  }
  if (!usuario) redirect('/login?desde=%2Fperfil')

  return <PerfilUsuario usuario={usuario} />
}
