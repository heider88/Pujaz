// Contrato con Pz_notificaciones_cl (rest.md §6).

export type NotificationType = 'WELCOME' | 'OUTBID' | 'AUCTION_WON' | 'AUCTION_LOST';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  // null en WELCOME.
  auctionId: string | null;
  createdAt: string;
}

export interface NotificationClient {
  /** GET /notificaciones/{userId} · de la más reciente a la más antigua; nunca 404 */
  getNotifications(userId: string): Promise<Notification[]>;
}
