// Crear cuenta. El formulario es un Client Component (estado del formulario y sesión).
import type { Metadata } from 'next'
import { FormularioRegistro } from '@/components/FormularioRegistro'

export const metadata: Metadata = { title: 'Crear cuenta · Pujaz' }

export default function RegistroPage() {
  return <FormularioRegistro />
}
