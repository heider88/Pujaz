import type { Notification, NotificationClient } from '../../../modules/notifications/index.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Coherente con auction.mock.ts: Ana superó a Luis en la subasta 12 y ganó la 14.
function seedNotifications(now: number): Notification[] {
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();
  return [
    { id: 'n-ana-1', userId: '7', type: 'WELCOME', message: 'Bienvenida a Pujaz', auctionId: null, createdAt: at(30 * DAY) },
    { id: 'n-ana-2', userId: '7', type: 'AUCTION_WON', message: 'Ganaste la subasta', auctionId: '14', createdAt: at(2 * DAY) },
    { id: 'n-luis-1', userId: '9', type: 'AUCTION_LOST', message: 'La subasta terminó y no ganaste', auctionId: '14', createdAt: at(2 * DAY) },
    { id: 'n-luis-2', userId: '9', type: 'OUTBID', message: 'Tu puja fue superada', auctionId: '12', createdAt: at(HOUR) },
  ];
}

export class MockNotificationClient implements NotificationClient {
  private readonly notifications: Notification[] = seedNotifications(Date.now());

  async getNotifications(userId: string): Promise<Notification[]> {
    return structuredClone(
      this.notifications
        .filter((notification) => notification.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
}
