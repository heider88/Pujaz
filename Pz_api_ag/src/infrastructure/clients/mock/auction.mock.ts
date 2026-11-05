import { AppError } from '../../../core/errors.js';
import type {
  Auction,
  AuctionClient,
  Bid,
  NewAuction,
  NewBid,
  PlacedBid,
  UserSummary,
} from '../../../modules/auctions/index.js';
import type { MemoryPriceEvents } from '../../events/memory.price-events.js';
import { MOCK_ITEM_IDS } from './item.mock.js';
import type { MockWalletClient } from './wallet.mock.js';

const DAY = 24 * 60 * 60 * 1000;

// Como el MS (auction_service.go): una puja debe superar el precio actual en al menos esto.
const MIN_BID_INCREMENT = 100;

// Como en el MS, cada puja guarda la reserva de la billetera que la respalda (rest.md §3.2).
// Las de la subasta 14 no tienen: ya se cobraron al cerrar.
interface StoredBid extends Bid {
  reservationId?: string;
}

interface StoredAuction {
  id: string;
  itemId: string;
  basePrice: number;
  bids: StoredBid[];
  endsAt: Date;
}

const ANA: UserSummary = { id: '7', name: 'Ana' };
const LUIS: UserSummary = { id: '9', name: 'Luis' };

// Las fechas se calculan al crear la instancia para que la demo no dependa de una fecha fija.
function seedAuctions(now: number): StoredAuction[] {
  return [
    {
      id: '12',
      itemId: MOCK_ITEM_IDS.watch,
      basePrice: 100000,
      bids: [
        { id: '54', amount: 110000, bidder: LUIS, createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), reservationId: '303' },
        { id: '55', amount: 120000, bidder: ANA, createdAt: new Date(now - 60 * 60 * 1000).toISOString(), reservationId: '301' },
      ],
      endsAt: new Date(now + 3 * DAY),
    },
    {
      id: '13',
      itemId: MOCK_ITEM_IDS.lamp,
      basePrice: 250000,
      bids: [],
      endsAt: new Date(now - DAY),
    },
    // Cerrada y ganada por Ana: es la subasta de su entrega en delivery.mock.ts.
    {
      id: '14',
      itemId: MOCK_ITEM_IDS.coin,
      basePrice: 50000,
      bids: [
        { id: '50', amount: 55000, bidder: LUIS, createdAt: new Date(now - 3 * DAY).toISOString() },
        { id: '51', amount: 60000, bidder: ANA, createdAt: new Date(now - 2 * DAY - 60 * 60 * 1000).toISOString() },
      ],
      endsAt: new Date(now - 2 * DAY),
    },
  ];
}

export class MockAuctionClient implements AuctionClient {
  private readonly auctions: StoredAuction[] = seedAuctions(Date.now());
  private nextId = 100;
  private nextBidId = 1000;

  // Simula los eventos que publica Pz_subastas_cl al guardar una puja: PujaSuperada (la billetera
  // falsa libera la reserva del superado, eventos.md §2) y PrecioActualizado (eventos.md §3).
  constructor(private readonly deps: { wallet?: MockWalletClient; priceEvents?: MemoryPriceEvents } = {}) {}

  async getAuctionsByItemIds(itemIds: string[]): Promise<Auction[]> {
    return this.auctions.filter((auction) => itemIds.includes(auction.itemId)).map(toAuction);
  }

  async getAuctionsByIds(ids: string[]): Promise<Auction[]> {
    return this.auctions.filter((auction) => ids.includes(auction.id)).map(toAuction);
  }

  // Mismo orden que el MS (rest.md §3.2). No toca la billetera: el Gateway ya reservó el monto.
  async placeBid(auctionId: string, input: NewBid): Promise<PlacedBid> {
    const stored = this.auctions.find((auction) => auction.id === auctionId);
    if (!stored) {
      throw new AppError('NOT_FOUND', 'La subasta no existe.');
    }
    const current = toAuction(stored);
    if (current.status === 'CLOSED') {
      throw new AppError('AUCTION_CLOSED', 'La subasta ya terminó.');
    }
    if (input.amount < current.currentPrice + MIN_BID_INCREMENT) {
      throw new AppError(
        'BID_TOO_LOW',
        `La puja debe superar el precio actual (${current.currentPrice}) en al menos ${MIN_BID_INCREMENT}.`,
      );
    }
    const previous = winningBidOf(stored);
    const bid: StoredBid = {
      id: String(this.nextBidId++),
      amount: input.amount,
      bidder: { id: input.userId, name: input.userName },
      createdAt: new Date().toISOString(),
      reservationId: input.reservationId,
    };
    stored.bids.push(bid);

    // La reserva anterior del mismo usuario la libera el Gateway; la de otro postor, PujaSuperada.
    let releasedReservationId: string | null = null;
    if (previous?.reservationId) {
      if (previous.bidder.id === input.userId) {
        releasedReservationId = previous.reservationId;
      } else {
        await this.deps.wallet?.releaseReservation(previous.bidder.id, previous.reservationId);
      }
    }
    this.deps.priceEvents?.emit(auctionId);
    return { bid: toBid(bid), auction: toAuction(stored), releasedReservationId };
  }

  // Mismas reglas que el MS (rest.md §3.1).
  async createAuction(input: NewAuction): Promise<Auction> {
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
      throw new AppError('BAD_USER_INPUT', 'La fecha de cierre debe estar en el futuro.');
    }
    if (!(input.basePrice > 0)) {
      throw new AppError('BAD_USER_INPUT', 'El precio base debe ser mayor que cero.');
    }
    if (this.auctions.some((auction) => auction.itemId === input.itemId)) {
      throw new AppError('BAD_USER_INPUT', 'Ese ítem ya tiene una subasta.');
    }
    const stored: StoredAuction = {
      id: String(this.nextId++),
      itemId: input.itemId,
      basePrice: input.basePrice,
      bids: [],
      endsAt,
    };
    this.auctions.push(stored);
    return toAuction(stored);
  }
}

// Igual que el MS (rest.md §3): status se calcula al leer, y currentPrice es la puja más alta o el precio base.
function toAuction(stored: StoredAuction): Auction {
  const winning = winningBidOf(stored);
  const participants = [...new Map(stored.bids.map((bid) => [bid.bidder.id, bid.bidder])).values()];
  return structuredClone({
    id: stored.id,
    itemId: stored.itemId,
    basePrice: stored.basePrice,
    currentPrice: winning?.amount ?? stored.basePrice,
    winningBid: winning ? toBid(winning) : null,
    participants,
    endsAt: stored.endsAt.toISOString(),
    status: Date.now() < stored.endsAt.getTime() ? 'OPEN' : 'CLOSED',
  });
}

function winningBidOf(stored: StoredAuction): StoredBid | null {
  return stored.bids.reduce<StoredBid | null>((best, bid) => (best === null || bid.amount > best.amount ? bid : best), null);
}

// Solo los campos del contrato: la reserva no sale de subastas.
function toBid({ id, amount, bidder, createdAt }: StoredBid): Bid {
  return structuredClone({ id, amount, bidder, createdAt });
}
