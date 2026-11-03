// Contrato con Pz_postpuja_cl (rest.md §5).

export type DeliveryStatus = 'PENDING' | 'CONFIRMED';

export interface Delivery {
  id: string;
  auctionId: string;
  itemId: string;
  winnerId: string;
  amount: number;
  status: DeliveryStatus;
  createdAt: string;
  // null mientras esté PENDING.
  confirmedAt: string | null;
}

export interface DeliveryClient {
  /** GET /deliveries?winnerId= · de la más reciente a la más antigua; nunca 404 */
  getDeliveries(winnerId: string): Promise<Delivery[]>;
  /** POST /deliveries/{deliveryId}/confirm · Errores: NOT_FOUND (no existe o no es de ese usuario), BAD_USER_INPUT (ya confirmada) */
  confirmDelivery(deliveryId: string, winnerId: string): Promise<Delivery>;
}
