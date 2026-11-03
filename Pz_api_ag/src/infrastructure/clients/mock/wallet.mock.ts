import { AppError } from '../../../core/errors.js';
import type {
  MovementType,
  Reservation,
  ReservationResult,
  Wallet,
  WalletClient,
  WalletMovement,
} from '../../../modules/wallet/index.js';

const HOUR = 60 * 60 * 1000;

// Único código que acepta el MS para recargar (wallet_controller.go).
export const VALID_PROMO_CODE = 'PROMO2026';

// Coherente con la subasta 12 de auction.mock.ts: Luis pujó 110000, Ana lo superó con 120000
// y a Luis se le devolvió su monto. La billetera de Ana es el ejemplo de rest.md §2.
function seedWallets(now: number): Wallet[] {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();
  return [
    {
      userId: '7',
      available: 380000,
      reserved: 120000,
      movements: [
        { id: '301', type: 'RESERVE', amount: 120000, auctionId: '12', createdAt: at(1) },
        { id: '300', type: 'DEPOSIT', amount: 500000, auctionId: null, createdAt: at(3) },
      ],
    },
    {
      userId: '9',
      available: 300000,
      reserved: 0,
      movements: [
        { id: '304', type: 'REFUND', amount: 110000, auctionId: '12', createdAt: at(1) },
        { id: '303', type: 'RESERVE', amount: 110000, auctionId: '12', createdAt: at(2) },
        { id: '302', type: 'DEPOSIT', amount: 300000, auctionId: null, createdAt: at(4) },
      ],
    },
  ];
}

export class MockWalletClient implements WalletClient {
  private readonly wallets: Wallet[] = seedWallets(Date.now());
  private readonly reservations: Reservation[] = [];
  private nextMovementId = 1000;
  private nextReservationId = 2000;

  async getWallet(userId: string): Promise<Wallet> {
    return structuredClone(this.findOrCreate(userId));
  }

  async deposit(userId: string, amount: number, promoCode?: string): Promise<Wallet> {
    if (!(amount > 0)) {
      throw new AppError('BAD_USER_INPUT', 'El monto de la recarga debe ser mayor que cero.');
    }
    if (promoCode !== VALID_PROMO_CODE) {
      throw new AppError('BAD_USER_INPUT', 'Código promocional inválido.');
    }
    const wallet = this.findOrCreate(userId);
    wallet.available += amount;
    wallet.movements.unshift(this.movement('DEPOSIT', amount, null));
    return structuredClone(wallet);
  }

  // Mismas reglas que el MS (rest.md §2).
  async reserve(userId: string, auctionId: string, amount: number): Promise<ReservationResult> {
    if (!(amount > 0)) {
      throw new AppError('BAD_USER_INPUT', 'El monto a reservar debe ser mayor que cero.');
    }
    const wallet = this.findOrCreate(userId);
    if (wallet.available < amount) {
      throw new AppError('INSUFFICIENT_FUNDS', 'No tienes saldo disponible suficiente.');
    }
    this.reserveForBid(userId, auctionId, amount);
    const reservation: Reservation = {
      id: String(this.nextReservationId++),
      userId,
      auctionId,
      amount,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.reservations.push(reservation);
    return structuredClone({ reservation, wallet });
  }

  // Idempotente: una reserva ya liberada o cobrada se devuelve como está, sin mover saldo.
  async releaseReservation(userId: string, reservationId: string): Promise<Reservation> {
    const reservation = this.reservations.find(
      (candidate) => candidate.id === reservationId && candidate.userId === userId,
    );
    if (!reservation) {
      throw new AppError('NOT_FOUND', 'La reserva no existe.');
    }
    if (reservation.status === 'ACTIVE') {
      this.refund(userId, reservation.auctionId, reservation.amount);
      reservation.status = 'RELEASED';
    }
    return structuredClone(reservation);
  }

  // Solo del cliente falso: los usa MockAuctionClient al pujar, como hace hoy el MS en su transacción.
  // Desaparecen cuando la puja pase a ser la Saga del Gateway (KAN-78).
  available(userId: string): number {
    return this.findOrCreate(userId).available;
  }

  reserveForBid(userId: string, auctionId: string, amount: number): void {
    const wallet = this.findOrCreate(userId);
    wallet.available -= amount;
    wallet.reserved += amount;
    wallet.movements.unshift(this.movement('RESERVE', amount, auctionId));
  }

  refund(userId: string, auctionId: string, amount: number): void {
    const wallet = this.findOrCreate(userId);
    wallet.reserved -= amount;
    wallet.available += amount;
    wallet.movements.unshift(this.movement('REFUND', amount, auctionId));
  }

  private movement(type: MovementType, amount: number, auctionId: string | null): WalletMovement {
    return { id: String(this.nextMovementId++), type, amount, auctionId, createdAt: new Date().toISOString() };
  }

  // En el MS cada usuario tiene billetera desde que se crea. El cliente falso no comparte datos
  // con MockUserClient, así que un usuario sin billetera guardada (uno recién registrado) recibe
  // una vacía en vez de NOT_FOUND.
  private findOrCreate(userId: string): Wallet {
    let wallet = this.wallets.find((candidate) => candidate.userId === userId);
    if (!wallet) {
      wallet = { userId, available: 0, reserved: 0, movements: [] };
      this.wallets.push(wallet);
    }
    return wallet;
  }
}
