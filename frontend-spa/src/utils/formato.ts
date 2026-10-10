// Formatos para mostrar precios, fechas y estados en español de Colombia.
import type { AuctionStatus } from '../api/items'

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatearPrecio(valor: number): string {
  return pesos.format(valor)
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function nombreEstado(estado: AuctionStatus): string {
  return estado === 'OPEN' ? 'Abierta' : 'Cerrada'
}
