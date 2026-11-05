// Avisos de que cambió el precio de una subasta (evento PrecioActualizado, eventos.md §3). Solo traen
// el id: el Gateway vuelve a leer la subasta, así un aviso viejo o repetido nunca muestra datos viejos.
export interface PriceEvents {
  onPriceUpdated(handler: (auctionId: string) => void): void;
  stop(): Promise<void>;
}
