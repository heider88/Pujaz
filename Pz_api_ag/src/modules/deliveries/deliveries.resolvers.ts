import { requireUser, type GatewayContext } from '../../core/context.js';
import { AppError } from '../../core/errors.js';
import type { LoadAuctionById } from '../auctions/index.js';
import type { Delivery } from './delivery.client.js';
import type { DeliveriesService } from './deliveries.service.js';

export function createDeliveriesResolvers(deliveriesService: DeliveriesService, loadAuctionById: LoadAuctionById) {
  return {
    Query: {
      myDeliveries: (_parent: unknown, _args: unknown, ctx: GatewayContext) =>
        deliveriesService.getMyDeliveries(requireUser(ctx).id),
    },
    Mutation: {
      // El ganador sale del token: solo se puede confirmar una entrega propia.
      confirmDelivery: (_parent: unknown, args: { id: string }, ctx: GatewayContext) =>
        deliveriesService.confirmDelivery(requireUser(ctx).id, args.id),
    },
    Delivery: {
      auction: async (delivery: Delivery, _args: unknown, ctx: GatewayContext) => {
        const auction = await loadAuctionById(delivery.auctionId, ctx);
        if (!auction) {
          throw new AppError('NOT_FOUND', 'La subasta de la entrega no existe.');
        }
        return auction;
      },
    },
  };
}
