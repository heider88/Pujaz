with open('Pz_web_fe/src/components/BilleteraUsuario.tsx', 'r') as f:
    content = f.read()

replacement = """'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useMutation } from '@apollo/client/react'
import { DEPOSIT, WALLET, type TipoMovimiento } from '../api/billetera'
import { codigoError } from '../api/errores'
import { formatearFecha, formatearPrecio } from '../utils/formato'
import { useRouter } from 'next/navigation'

const NOMBRE_MOVIMIENTO: Record<TipoMovimiento, string> = {
  DEPOSIT: 'Recarga',
  RESERVE: 'Reserva por puja',
  REFUND: 'Reintegro',
}

function signo(tipo: TipoMovimiento): string {
  return tipo === 'RESERVE' ? '−' : '+'
}

export function BilleteraUsuario({ wallet, token }: { wallet: any, token: string }) {
  const [monto, setMonto] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [errorRecarga, setErrorRecarga] = useState<string | null>(null)
  const [recargado, setRecargado] = useState<number | null>(null)
  const router = useRouter()

  const [recargar, { loading: recargando }] = useMutation(DEPOSIT)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErrorRecarga(null)
    setRecargado(null)
    const cantidad = Number(monto)
    if (!(cantidad > 0)) {
      setErrorRecarga('El monto debe ser mayor que cero.')
      return
    }
    try {
      await recargar({ variables: { amount: cantidad, promoCode: promoCode.trim() } })
      setRecargado(cantidad)
      setMonto('')
      setPromoCode('')
      router.refresh()
    } catch (e) {
      setErrorRecarga(
        codigoError(e) === 'BAD_USER_INPUT'
          ? 'Monto o código promocional inválidos.'
          : 'No se pudo hacer la recarga. Intenta de nuevo en un momento.',
      )
    }
  }

  const { available, reserved, movements } = wallet

  return (
    <section>
      <h1>Mi billetera</h1>

      <div className="saldos">
        <div className="saldo">
          <p className="categoria">Disponible para pujar</p>
          <p className="saldo-valor" aria-label="Saldo disponible">
            {formatearPrecio(available)}
          </p>
        </div>
        <div className="saldo">
          <p className="categoria">Reservado en pujas que vas ganando</p>
          <p className="saldo-valor" aria-label="Saldo reservado">
            {formatearPrecio(reserved)}
          </p>
        </div>
      </div>

      <h2>Recargar</h2>
      <form className="formulario pagina-angosta" onSubmit={enviar}>
        <label htmlFor="monto-recarga">Monto a recargar (COP)</label>
        <input
          id="monto-recarga"
          type="number"
          inputMode="numeric"
          min={1}
          step="any"
          required
          value={monto}
          onChange={(evento) => setMonto(evento.target.value)}
        />
        <label htmlFor="promo-code">Código promocional</label>
        <input
          id="promo-code"
          type="text"
          required
          placeholder="Ej: PROMO2026"
          value={promoCode}
          onChange={(evento) => setPromoCode(evento.target.value)}
        />
        <button type="submit" disabled={recargando}>
          {recargando ? 'Recargando…' : 'Recargar'}
        </button>
        {recargado !== null && (
          <p role="status" className="mensaje-ok">
            Recargaste {formatearPrecio(recargado)}.
          </p>
        )}
        {errorRecarga && (
          <p role="alert" className="mensaje-error">
            {errorRecarga}
          </p>
        )}
      </form>

      <h2>Movimientos</h2>
      {movements.length === 0 ? (
        <p>Todavía no tienes movimientos.</p>
      ) : (
        <table className="tabla-movimientos">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Tipo</th>
              <th scope="col">Monto</th>
              <th scope="col">Subasta</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m: any) => (
              <tr key={m.id}>
                <td>{formatearFecha(m.createdAt)}</td>
                <td>{NOMBRE_MOVIMIENTO[m.type as TipoMovimiento]}</td>
                <td className={m.type === 'RESERVE' ? 'monto-negativo' : 'monto-positivo'}>
                  {signo(m.type)} {formatearPrecio(m.amount)}
                </td>
                <td>
                  {m.auction ? (
                    <Link href={`/items/${m.auction.item.id}`}>{m.auction.item.name}</Link>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
"""

with open('Pz_web_fe/src/components/BilleteraUsuario.tsx', 'w') as f:
    f.write(replacement)
