import type { Delivery, DeliveryClient } from './delivery.client.js';

export class DeliveriesService {
  constructor(private readonly deliveryClient: DeliveryClient) {}

  getMyDeliveries(userId: string): Promise<Delivery[]> {
    return this.deliveryClient.getDeliveries(userId);
  }

  // El MS valida que la entrega sea de este usuario (NOT_FOUND) y que no esté confirmada (BAD_USER_INPUT).
  confirmDelivery(userId: string, deliveryId: string): Promise<Delivery> {
    return this.deliveryClient.confirmDelivery(deliveryId, userId);
  }
}
