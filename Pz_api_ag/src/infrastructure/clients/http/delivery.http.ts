import type { Delivery, DeliveryClient } from '../../../modules/deliveries/index.js';
import { parseDelivery, parseList } from '../../http/contract.js';
import type { HttpClient } from '../../http/http-client.js';

// Pz_postpuja_cl, rest.md §5.
export class HttpDeliveryClient implements DeliveryClient {
  constructor(private readonly http: HttpClient) {}

  getDeliveries(winnerId: string): Promise<Delivery[]> {
    return this.http.get(`/deliveries?winnerId=${encodeURIComponent(winnerId)}`, parseList(parseDelivery));
  }

  confirmDelivery(deliveryId: string, winnerId: string): Promise<Delivery> {
    return this.http.post(`/deliveries/${encodeURIComponent(deliveryId)}/confirm`, { winnerId }, parseDelivery);
  }
}
