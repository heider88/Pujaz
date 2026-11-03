// Iniciar sesión. El formulario es un Client Component (estado del formulario y sesión).
// <Suspense> hace falta porque el formulario lee ?desde= de la URL.
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FormularioLogin } from '@/components/FormularioLogin'

export const metadata: Metadata = { title: 'Iniciar sesión · Pujaz' }

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="nota">Cargando…</p>}>
      <FormularioLogin />
    </Suspense>
  )
}
