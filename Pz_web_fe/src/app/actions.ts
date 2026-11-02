'use server'

import { cookies } from 'next/headers'

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('pujaz_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('pujaz_token')
}
