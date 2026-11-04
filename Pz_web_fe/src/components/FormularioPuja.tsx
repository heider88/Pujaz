'use client'
// Formulario para pujar (mutation placeBid). Muestra los errores del contrato con mensajes claros.
import { useMutation, useQuery } from '@apollo/client/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { WALLET } from '../api/billetera'
import { codigoError } from '../api/errores'
import { PLACE_BID, type AuctionDetail, type Bid } from '../api/items'
import { useSesion } from '../session/SessionContext'
import { formatearPrecio } from '../utils/formato'

// Atajos para subir la oferta sobre el precio actual.
const INCREMENTOS = [5000, 10000, 20000]

function mensajeDeError(error: unknown) {
  switch (codigoError(error)) {
    case 'BID_TOO_LOW':
      return 'Tu oferta debe superar el precio actual por al menos 100 COP.'
    case 'INSUFFICIENT_FUNDS':
      return (
        <>
          No tienes saldo disponible suficiente. <Link href="/billetera">Recarga tu billetera</Link>.
        </>
      )
    case 'AUCTION_CLOSED':
      return 'Esta subasta ya terminó.'
    case 'UNAUTHENTICATED':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    case 'NOT_FOUND':
      return 'Esta subasta ya no existe.'
    case 'BAD_USER_INPUT':
      return 'Revisa el monto de tu oferta.'
    default:
      return 'No se pudo registrar la puja. Intenta de nuevo en un momento.'
  }
}

interface Props {
  subasta: AuctionDetail
  // Avisa al panel que la puja propia se aceptó, para mostrar el precio nuevo de una vez
  // (la suscripción trae después el resto, como los participantes).
  onPujaAceptada?: (puja: Bid) => void
}

export function FormularioPuja({ subasta, onPujaAceptada }: Props) {
  const { usuario } = useSesion()
  const ruta = usePathname()
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pujaAceptada, setPujaAceptada] = useState<number | null>(null)
  const [pujar, { loading }] = useMutation(PLACE_BID)

  // Saldo de quien va a pujar, para que sepa cuánto puede ofrecer sin salir de la subasta.
  const { data: datosBilletera, refetch: refrescarBilletera } = useQuery(WALLET, { skip: !usuario })
  const disponible = datosBilletera?.wallet.available

  // Cuando cambia quién va ganando (puja propia o de otra persona), el saldo pudo cambiar:
  // la puja propia reserva dinero y si a uno lo superan, el dinero vuelve al disponible.
  const idGanadora = subasta.winningBid?.id
  useEffect(() => {
    if (usuario && idGanadora) void refrescarBilletera()
  }, [usuario, idGanadora, refrescarBilletera])

  if (!usuario) {
    return (
      <p>
        <Link href={`/login?desde=${encodeURIComponent(ruta)}`}>Inicia sesión para pujar</Link>
      </p>
    )
  }

  if (subasta.status === 'CLOSED') {
    return <p>Esta subasta ya terminó: no recibe más pujas.</p>
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setPujaAceptada(null)
    const cantidad = Number(monto)
    try {
      const { data } = await pujar({ variables: { auctionId: subasta.id, amount: cantidad } })
      if (data) {
        setPujaAceptada(data.placeBid.amount)
        setMonto('')
        onPujaAceptada?.(data.placeBid)
      }
    } catch (e) {
      setError(e)
    }
  }

  return (
    <form className="formulario formulario-puja" onSubmit={enviar}>
      {disponible !== undefined && (
        <p className="saldo-puja">
          <span>
            Tu saldo disponible <strong>{formatearPrecio(disponible)}</strong>
          </span>
          <Link href="/billetera">Recargar</Link>
        </p>
      )}
      <div className="atajos" role="group" aria-label="Subir la oferta rápido">
        {INCREMENTOS.map((incremento) => (
          <button
            key={incremento}
            type="button"
            className="boton-secundario"
            onClick={() => {
              const actual = Number(monto)
              const base = actual && actual >= subasta.currentPrice ? actual : subasta.currentPrice
              setMonto(String(Number(base) + incremento))
              setError(null)
              setPujaAceptada(null)
            }}
          >
            + {formatearPrecio(incremento)}
          </button>
        ))}
      </div>
      <label htmlFor="monto-puja">Tu oferta (COP)</label>
      <input
        id="monto-puja"
        type="number"
        inputMode="numeric"
        min={subasta.currentPrice + 100}
        step="any"
        required
        placeholder={`Mínimo ${formatearPrecio(subasta.currentPrice + 100)}`}
        value={monto}
        onChange={(evento) => {
          setMonto(evento.target.value)
          setError(null)
          setPujaAceptada(null)
          evento.target.setCustomValidity('')
        }}
        onInvalid={(evento) => {
          const target = evento.target as HTMLInputElement
          if (target.validity.rangeUnderflow) {
            target.setCustomValidity(
              `El valor debe ser superior o igual a ${formatearPrecio(subasta.currentPrice + 100)}`,
            )
          }
        }}
      />
      {disponible !== undefined && Number(monto) > disponible && (
        <p className="ayuda ayuda--aviso">Tu oferta supera tu saldo disponible.</p>
      )}
      <button type="submit" className="boton-pujar" disabled={loading}>
        {loading ? 'Enviando…' : 'Pujar'}
      </button>
      {error !== null && (
        <p role="alert" className="mensaje-error">
          {mensajeDeError(error)}
        </p>
      )}
      {pujaAceptada !== null && (
        <p role="status" className="mensaje-ok">
          Tu puja de {formatearPrecio(pujaAceptada)} quedó registrada.
        </p>
      )}
    </form>
  )
}
