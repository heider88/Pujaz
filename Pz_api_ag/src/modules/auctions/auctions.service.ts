import DataLoader from 'dataloader';
import { AppError, type ErrorCode } from '../../core/errors.js';
import type { GatewayPubSub } from '../../core/pubsub.js';
import type { CatalogService, Item, NewItem } from '../catalog/index.js';
import type { UserClient } from '../users/index.js';
import type { WalletClient } from '../wallet/index.js';
import type { Auction, AuctionClient, Bid, PlacedBid } from './auction.client.js';

// Si la SPA no envía endsAt, la subasta dura dos semanas. El Gateway no pone tope a la fecha:
// las reglas sobre ella (por ejemplo, que no esté en el pasado) son del MS.
export const DEFAULT_AUCTION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// Errores con los que subastas rechaza la puja con certeza: la puja no se guardó y hay que compensar.
// Cualquier otro (INTERNAL: tiempo agotado, MS caído) deja la duda de si se guardó.
const BID_REJECTIONS: readonly ErrorCode[] = ['NOT_FOUND', 'AUCTION_CLOSED', 'BID_TOO_LOW', 'BAD_USER_INPUT'];

// Liberar es idempotente (rest.md §2), así que reintentar no devuelve el dinero dos veces.
const RELEASE_ATTEMPTS = 3;

// Lo que llega de GraphQL (CreateItemInput).
export interface CreateItemInput {
  name: string;
  description?: string | null;
  category?: string | null;
  images?: string[] | null;
  documents?: string[] | null;
  basePrice: number;
  endsAt?: string | null;
}

export interface CreatedItem {
  item: Item;
  auction: Auction;
}

export interface AuctionLoaders {
  auctionByItemId: DataLoader<string, Auction | null>;
  auctionById: DataLoader<string, Auction | null>;
  item: DataLoader<string, Item | null>;
}

export class AuctionsService {
  constructor(
    private readonly auctionClient: AuctionClient,
    private readonly catalogService: CatalogService,
    private readonly pubsub: GatewayPubSub,
    private readonly walletClient: WalletClient,
    private readonly userClient: UserClient,
  ) {}

  // Saga de la puja (rest.md §3.4): 1) reservar en la billetera, 2) pujar en subastas con esa reserva,
  // 3) si subastas la rechaza, liberar la reserva (compensación) y 4) liberar la reserva anterior del
  // mismo usuario si subió su propia puja. El reintegro al postor superado no lo hace el Gateway: le
  // llega a la billetera con el evento PujaSuperada. Solo una puja guardada se avisa a los suscriptores.
  async placeBid(userId: string, auctionId: string, amount: number): Promise<Bid> {
    const user = await this.userClient.getUser(userId);
    const { reservation } = await this.walletClient.reserve(userId, auctionId, amount);

    let placed: PlacedBid;
    try {
      placed = await this.auctionClient.placeBid(auctionId, {
        userId,
        userName: user.name,
        amount,
        reservationId: reservation.id,
      });
    } catch (error) {
      const stored = isBidRejection(error) ? null : await this.findStoredBid(auctionId, userId, amount);
      if (!stored) {
        await this.release(userId, reservation.id, 'subastas no guardó la puja');
        throw error;
      }
      // Subastas no respondió pero la puja quedó guardada: la Saga terminó bien. Sin la respuesta no se
      // sabe si había una reserva anterior propia para liberar; si la había, queda en el log de subastas.
      console.error(`[gateway] la puja de ${userId} en ${auctionId} se guardó aunque subastas no respondió.`);
      placed = { bid: stored.bid, auction: stored.auction, releasedReservationId: null };
    }

    if (placed.releasedReservationId !== null) {
      await this.release(userId, placed.releasedReservationId, 'el usuario subió su propia puja');
    }
    this.pubsub.publish('auctionUpdated', placed.auction.id, placed.auction);
    return placed.bid;
  }

  // Tras un error incierto: la puja quedó guardada si hoy es la ganadora, de este usuario y con este monto.
  // Si la consulta también falla, se toma como no guardada y se compensa.
  private async findStoredBid(auctionId: string, userId: string, amount: number) {
    try {
      const [auction] = await this.auctionClient.getAuctionsByIds([auctionId]);
      const bid = auction?.winningBid;
      return auction && bid && bid.bidder.id === userId && bid.amount === amount ? { bid, auction } : null;
    } catch {
      return null;
    }
  }

  // Nunca lanza: si no se pudo liberar, lo deja en el log para arreglarlo a mano y la Saga sigue con
  // su resultado (el error original de la puja, o la puja ya guardada).
  private async release(userId: string, reservationId: string, reason: string): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= RELEASE_ATTEMPTS; attempt++) {
      try {
        await this.walletClient.releaseReservation(userId, reservationId);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    console.error(`[gateway] la reserva ${reservationId} de ${userId} quedó sin liberar (${reason}).`, lastError);
  }

  subscribeToAuction(auctionId: string) {
    return this.pubsub.subscribe('auctionUpdated', auctionId);
  }

  // Crea el ítem en el MS catálogo y luego su subasta en el MS transaccional (rest.md §3).
  // Si la subasta falla, el ítem queda sin subasta: no hay compensación automática en el prototipo,
  // solo se deja registrado.
  async createItem(input: CreateItemInput): Promise<CreatedItem> {
    const item = await this.catalogService.createItem(toNewItem(input));
    const endsAt = input.endsAt ?? new Date(Date.now() + DEFAULT_AUCTION_DURATION_MS).toISOString();
    try {
      const auction = await this.auctionClient.createAuction({ itemId: item.id, basePrice: item.basePrice, endsAt });
      return { item, auction };
    } catch (error) {
      console.error(`[gateway] el ítem ${item.id} se creó pero su subasta no: queda sin subasta.`, error);
      throw error;
    }
  }

  // Cargadores de una petición: todos los Item.auction, WalletMovement.auction (o Auction.item)
  // de una consulta se resuelven con una sola llamada al MS.
  createLoaders(): AuctionLoaders {
    return {
      auctionByItemId: new DataLoader(async (itemIds) => {
        const auctions = await this.auctionClient.getAuctionsByItemIds([...itemIds]);
        const byItemId = new Map(auctions.map((auction) => [auction.itemId, auction]));
        return itemIds.map((itemId) => byItemId.get(itemId) ?? null);
      }),
      auctionById: new DataLoader(async (ids) => {
        const auctions = await this.auctionClient.getAuctionsByIds([...ids]);
        const byId = new Map(auctions.map((auction) => [auction.id, auction]));
        return ids.map((id) => byId.get(id) ?? null);
      }),
      item: this.catalogService.createItemLoader(),
    };
  }
}

// Solo los campos que llegan con valor: null en GraphQL significa "no enviado".
function toNewItem(input: CreateItemInput): NewItem {
  const item: NewItem = { name: input.name, basePrice: input.basePrice };
  if (input.description != null) item.description = input.description;
  if (input.category != null) item.category = input.category;
  if (input.images != null) item.images = input.images;
  if (input.documents != null) item.documents = input.documents;
  return item;
}

function isBidRejection(error: unknown): boolean {
  return error instanceof AppError && BID_REJECTIONS.includes(error.code);
}
