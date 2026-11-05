import type { Reservation, ReservationResult, Wallet, WalletClient } from '../../../modules/wallet/index.js';
import { parseReservation, parseReservationResult, parseWallet } from '../../http/contract.js';
import type { HttpClient } from '../../http/http-client.js';

// Pz_billetera_cl, rest.md §2.
export class HttpWalletClient implements WalletClient {
  constructor(private readonly http: HttpClient) {}

  getWallet(userId: string): Promise<Wallet> {
    return this.http.get(`/users/${encodeURIComponent(userId)}/wallet`, parseWallet);
  }

  deposit(userId: string, amount: number, promoCode?: string): Promise<Wallet> {
    return this.http.post(`/users/${encodeURIComponent(userId)}/wallet/deposits`, { amount, promoCode }, parseWallet);
  }

  reserve(userId: string, auctionId: string, amount: number): Promise<ReservationResult> {
    return this.http.post(
      `/users/${encodeURIComponent(userId)}/wallet/reservations`,
      { auctionId, amount },
      parseReservationResult,
    );
  }

  releaseReservation(userId: string, reservationId: string): Promise<Reservation> {
    return this.http.post(
      `/users/${encodeURIComponent(userId)}/wallet/reservations/${encodeURIComponent(reservationId)}/release`,
      undefined,
      parseReservation,
    );
  }
}
