import type { Notification, NotificationClient } from '../../../modules/notifications/index.js';
import { parseList, parseNotification } from '../../http/contract.js';
import type { HttpClient } from '../../http/http-client.js';

// Pz_notificaciones_cl, rest.md §6.
export class HttpNotificationClient implements NotificationClient {
  constructor(private readonly http: HttpClient) {}

  getNotifications(userId: string): Promise<Notification[]> {
    return this.http.get(`/notificaciones/${encodeURIComponent(userId)}`, parseList(parseNotification));
  }
}
