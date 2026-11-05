import { requireUser, type GatewayContext } from '../../core/context.js';
import type { LoadAuctionById } from '../auctions/index.js';
import type { Notification } from './notification.client.js';
import type { NotificationsService } from './notifications.service.js';

export function createNotificationsResolvers(notificationsService: NotificationsService, loadAuctionById: LoadAuctionById) {
  return {
    Query: {
      myNotifications: (_parent: unknown, _args: unknown, ctx: GatewayContext) =>
        notificationsService.getMyNotifications(requireUser(ctx).id),
    },
    Notification: {
      // WELCOME no tiene subasta.
      auction: (notification: Notification, _args: unknown, ctx: GatewayContext) =>
        notification.auctionId === null ? null : loadAuctionById(notification.auctionId, ctx),
    },
  };
}
