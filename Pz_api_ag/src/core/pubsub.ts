import { createPubSub } from 'graphql-yoga';
import type { Auction } from '../modules/auctions/index.js';

// Reparto local de auctionUpdated a los WebSocket de esta copia del Gateway. Lo que se reparte llega
// del broker (PrecioActualizado), así que cada copia ve también las pujas hechas en las demás.
export type GatewayPubSub = ReturnType<typeof createGatewayPubSub>;

export function createGatewayPubSub() {
  return createPubSub<{
    // Tema por subasta: solo reciben el evento quienes siguen esa subasta.
    auctionUpdated: [auctionId: string, auction: Auction];
  }>();
}
