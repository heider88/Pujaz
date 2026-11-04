'use client'
// Panel de la subasta en tiempo real: se suscribe a `auctionUpdated` (publicar-suscribir).
// El servidor manda el estado inicial (props) y cada puja aceptada llega después por WebSocket.
import { useSubscription } from '@apollo/client/react'
import { useState } from 'react'
import { AUCTION_UPDATED, type AuctionDetail, type Bid } from '../api/items'
import { useSesion } from '../session/SessionContext'
import { formatearFecha, formatearPrecio, nombreEstado, tiempoRelativo } from '../utils/formato'
import { useAhora } from '../utils/reloj'
import { Avatar } from './Avatar'
import { CuentaRegresiva } from './CuentaRegresiva'
import { FormularioPuja } from './FormularioPuja'

// La puja propia se refleja de una vez, sin esperar el aviso de la suscripción.
function conPuja(subasta: AuctionDetail, puja: Bid): AuctionDetail {
  const yaParticipa = subasta.participants.some((p) => p.id === puja.bidder.id)
  return {
    ...subasta,
    currentPrice: puja.amount,
    winningBid: puja,
    participants: yaParticipa ? subasta.participants : [...subasta.participants, puja.bidder],
  }
}

export function PanelSubasta({ subasta: inicial }: { subasta: AuctionDetail }) {
  const { usuario } = useSesion()
  const ahora = useAhora()
  const [subasta, setSubasta] = useState(inicial)
  const [mostrarToastGanador, setMostrarToastGanador] = useState(false)

  useSubscription(AUCTION_UPDATED, {
    variables: { auctionId: inicial.id },
    onData: ({ data }) => {
      const nueva = data.data?.auctionUpdated
      if (nueva) {
        if (subasta.status === 'OPEN' && nueva.status === 'CLOSED') {
          if (usuario && nueva.winningBid?.bidder.id === usuario.id) {
            setMostrarToastGanador(true)
            setTimeout(() => setMostrarToastGanador(false), 6000)
          }
        }
        setSubasta(nueva)
      }
    },
  })

  // Actividad reciente: la puja ganadora inicial y cada puja nueva que llega mientras
  // la página está abierta (el contrato no trae el historial completo).
  const [actividad, setActividad] = useState<Bid[]>(() =>
    subasta.winningBid ? [subasta.winningBid] : [],
  )
  if (subasta.winningBid && actividad[0]?.id !== subasta.winningBid.id) {
    setActividad([subasta.winningBid, ...actividad].slice(0, 6))
  }

  const abierta = subasta.status === 'OPEN'
  const ganador = subasta.winningBid?.bidder
  const vaGanando = Boolean(usuario && ganador?.id === usuario.id)
  const teSuperaron =
    Boolean(usuario) && !vaGanando && subasta.participants.some((p) => p.id === usuario?.id)

  return (
    <section aria-labelledby="titulo-subasta" className="panel-subasta">
      {mostrarToastGanador && (
        <div className="toast-ganador" role="alert">
          🎉 ¡Felicidades! Has ganado esta subasta.
        </div>
      )}

      <div className="panel-subasta__cabecera">
        <h2 id="titulo-subasta">Subasta</h2>
        {abierta ? (
          <span className="en-vivo">En vivo</span>
        ) : (
          <span className="cerrada">Cerrada</span>
        )}
      </div>

      {abierta && <CuentaRegresiva hasta={subasta.endsAt} />}

      <p className="precio-actual">
        Precio actual
        <strong>
          {formatearPrecio(subasta.currentPrice)} <span className="moneda">COP</span>
        </strong>
      </p>
      <p className="subasta-meta">
        <span className={`estado estado--${abierta ? 'abierta' : 'cerrada'}`}>
          Estado: {nombreEstado(subasta.status)}
        </span>
        <span>Cierra: {formatearFecha(subasta.endsAt)}</span>
      </p>

      {vaGanando && <p className="aviso aviso--ok">Vas ganando esta subasta.</p>}
      {teSuperaron && <p className="aviso aviso--error">Te superaron. Puedes volver a pujar.</p>}

      {subasta.winningBid ? (
        <p className="va-ganando">
          Va ganando <strong>{ganador?.name}</strong> con {formatearPrecio(subasta.winningBid.amount)}
        </p>
      ) : (
        <p className="va-ganando">Todavía no hay pujas. Puedes ser el primero.</p>
      )}

      {actividad.length > 0 && (
        <>
          <h3>Actividad reciente</h3>
          <ol className="actividad" aria-label="Actividad reciente">
            {actividad.map((puja, i) => {
              const anterior = actividad[i + 1]
              return (
                <li key={puja.id}>
                  <Avatar nombre={puja.bidder.name} />
                  <span className="actividad__quien">
                    {puja.bidder.name}
                    <small>{ahora === null ? formatearFecha(puja.createdAt) : tiempoRelativo(puja.createdAt, ahora)}</small>
                  </span>
                  <span className="actividad__monto">
                    {formatearPrecio(puja.amount)}
                    {anterior && <small>+ {formatearPrecio(puja.amount - anterior.amount)}</small>}
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}

      <h3>Participantes ({subasta.participants.length})</h3>
      {subasta.participants.length > 0 ? (
        <ul aria-label="Participantes" className="participantes">
          {subasta.participants.map((p) => (
            <li key={p.id}>
              <Avatar nombre={p.name} />
              {p.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="nota">Nadie ha pujado todavía.</p>
      )}

      <FormularioPuja subasta={subasta} onPujaAceptada={(puja) => setSubasta((s) => conPuja(s, puja))} />
    </section>
  )
}
