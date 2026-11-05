import type { Notification, NotificationClient } from './notification.client.js';

export class NotificationsService {
  constructor(private readonly notificationClient: NotificationClient) {}

  getMyNotifications(userId: string): Promise<Notification[]> {
    return this.notificationClient.getNotifications(userId);
  }
}
