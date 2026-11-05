import type { PriceEvents } from '../../modules/auctions/index.js';

// Para USE_MOCKS=true: MockAuctionClient avisa aquí al guardar una puja, como hace Pz_subastas_cl al
// publicar PrecioActualizado. Sin broker, solo funciona dentro de este proceso.
export class MemoryPriceEvents implements PriceEvents {
  private readonly handlers: ((auctionId: string) => void)[] = [];

  onPriceUpdated(handler: (auctionId: string) => void): void {
    this.handlers.push(handler);
  }

  emit(auctionId: string): void {
    for (const handler of this.handlers) handler(auctionId);
  }

  async stop(): Promise<void> {}
}
