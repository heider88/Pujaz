// Contrato con Pz_billetera_cl (rest.md §2).

export type MovementType = 'DEPOSIT' | 'RESERVE' | 'REFUND' | 'CHARGE';

export interface WalletMovement {
  id: string;
  type: MovementType;
  amount: number;
  // null en las recargas (DEPOSIT).
  auctionId: string | null;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  available: number;
  reserved: number;
  // Del más reciente al más antiguo.
  movements: WalletMovement[];
}

// ACTIVE: el monto está en reserved. RELEASED: volvió a available. CHARGED: se cobró al cerrar la subasta.
export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CHARGED';

export interface Reservation {
  id: string;
  userId: string;
  auctionId: string;
  amount: number;
  status: ReservationStatus;
  createdAt: string;
}

// Respuesta de POST /users/{userId}/wallet/reservations (rest.md §2).
export interface ReservationResult {
  reservation: Reservation;
  wallet: Wallet;
}

export interface WalletClient {
  /** GET /users/{userId}/wallet · Errores: NOT_FOUND */
  getWallet(userId: string): Promise<Wallet>;
  /** POST /users/{userId}/wallet/deposits · Errores: BAD_USER_INPUT (amount <= 0 o promoCode inválido), NOT_FOUND */
  deposit(userId: string, amount: number, promoCode?: string): Promise<Wallet>;
  /** POST /users/{userId}/wallet/reservations · paso 1 de la Saga · Errores: INSUFFICIENT_FUNDS, BAD_USER_INPUT, NOT_FOUND */
  reserve(userId: string, auctionId: string, amount: number): Promise<ReservationResult>;
  /** POST /users/{userId}/wallet/reservations/{reservationId}/release · compensación, idempotente · Errores: NOT_FOUND */
  releaseReservation(userId: string, reservationId: string): Promise<Reservation>;
}
