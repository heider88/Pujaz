import { AppError } from '../../../core/errors.js';
import type { Delivery, DeliveryClient } from '../../../modules/deliveries/index.js';
import { MOCK_ITEM_IDS } from './item.mock.js';

const DAY = 24 * 60 * 60 * 1000;

// Coherente con la subasta 14 de auction.mock.ts: cerró hace 2 días y la ganó Ana con 60000.
function seedDeliveries(now: number): Delivery[] {
  return [
    {
      id: '6726a1f0c3b2a90012ab0001',
      auctionId: '14',
      itemId: MOCK_ITEM_IDS.coin,
      winnerId: '7',
      amount: 60000,
      status: 'PENDING',
      createdAt: new Date(now - 2 * DAY).toISOString(),
      confirmedAt: null,
    },
  ];
}

export class MockDeliveryClient implements DeliveryClient {
  private readonly deliveries: Delivery[] = seedDeliveries(Date.now());

  async getDeliveries(winnerId: string): Promise<Delivery[]> {
    return structuredClone(
      this.deliveries
        .filter((delivery) => delivery.winnerId === winnerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  // Mismas reglas que el MS (rest.md §5): la entrega de otro usuario es NOT_FOUND, para no revelar que existe.
  async confirmDelivery(deliveryId: string, winnerId: string): Promise<Delivery> {
    const delivery = this.deliveries.find((candidate) => candidate.id === deliveryId && candidate.winnerId === winnerId);
    if (!delivery) {
      throw new AppError('NOT_FOUND', 'La entrega no existe.');
    }
    if (delivery.status === 'CONFIRMED') {
      throw new AppError('BAD_USER_INPUT', 'La entrega ya estaba confirmada.');
    }
    delivery.status = 'CONFIRMED';
    delivery.confirmedAt = new Date().toISOString();
    return structuredClone(delivery);
  }
}
