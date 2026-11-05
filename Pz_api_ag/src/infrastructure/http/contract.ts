// Valida que las respuestas de los MS traigan todo lo que exige rest.md. Si falta algo obligatorio,
// la respuesta no se usa: no se inventan datos. Cada función devuelve solo los campos del contrato,
// así lo que el MS agregue de más no llega a la SPA.
import type { Auction, AuctionStatus, Bid, PlacedBid, UserSummary } from '../../modules/auctions/index.js';
import type { Item } from '../../modules/catalog/index.js';
import type { Delivery, DeliveryStatus } from '../../modules/deliveries/index.js';
import type { Notification, NotificationType } from '../../modules/notifications/index.js';
import type { User } from '../../modules/users/index.js';
import type {
  MovementType,
  Reservation,
  ReservationResult,
  ReservationStatus,
  Wallet,
  WalletMovement,
} from '../../modules/wallet/index.js';

export class ContractError extends Error {
  override name = 'ContractError';
}

type Json = Record<string, unknown>;

function object(value: unknown, where: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError(`${where} no es un objeto`);
  }
  return value as Json;
}

// Una lista vacía puede llegar como null: el MS transaccional (Go) serializa así un slice vacío.
function list(value: unknown, where: string): unknown[] {
  if (value === null) return [];
  if (!Array.isArray(value)) {
    throw new ContractError(`${where} no es una lista`);
  }
  return value;
}

function field(json: Json, key: string, where: string): unknown {
  if (!(key in json)) {
    throw new ContractError(`falta ${where}.${key}`);
  }
  return json[key];
}

function string(json: Json, key: string, where: string): string {
  const value = field(json, key, where);
  if (typeof value !== 'string') throw new ContractError(`${where}.${key} no es texto`);
  return value;
}

function nullableString(json: Json, key: string, where: string): string | null {
  const value = field(json, key, where);
  if (value !== null && typeof value !== 'string') throw new ContractError(`${where}.${key} no es texto ni null`);
  return value;
}

function number(json: Json, key: string, where: string): number {
  const value = field(json, key, where);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ContractError(`${where}.${key} no es un número`);
  return value;
}

function stringList(json: Json, key: string, where: string): string[] {
  const value = list(field(json, key, where), `${where}.${key}`);
  if (!value.every((entry) => typeof entry === 'string')) throw new ContractError(`${where}.${key} no es una lista de texto`);
  return value as string[];
}

function oneOf<T extends string>(json: Json, key: string, allowed: readonly T[], where: string): T {
  const value = string(json, key, where);
  if (!allowed.includes(value as T)) throw new ContractError(`${where}.${key} = "${value}" no es ${allowed.join(' | ')}`);
  return value as T;
}

// rest.md §1 · User
export function parseUser(value: unknown): User {
  const json = object(value, 'User');
  return {
    id: string(json, 'id', 'User'),
    name: string(json, 'name', 'User'),
    email: string(json, 'email', 'User'),
    role: string(json, 'role', 'User'),
    createdAt: string(json, 'createdAt', 'User'),
  };
}

// rest.md §3 · UserSummary
function parseUserSummary(value: unknown, where: string): UserSummary {
  const json = object(value, where);
  return { id: string(json, 'id', where), name: string(json, 'name', where) };
}

function parseBid(value: unknown): Bid {
  const json = object(value, 'Bid');
  return {
    id: string(json, 'id', 'Bid'),
    amount: number(json, 'amount', 'Bid'),
    bidder: parseUserSummary(field(json, 'bidder', 'Bid'), 'Bid.bidder'),
    createdAt: string(json, 'createdAt', 'Bid'),
  };
}

const AUCTION_STATUSES: readonly AuctionStatus[] = ['OPEN', 'CLOSED'];

// rest.md §3 · Auction
export function parseAuction(value: unknown): Auction {
  const json = object(value, 'Auction');
  const winningBid = field(json, 'winningBid', 'Auction');
  return {
    id: string(json, 'id', 'Auction'),
    itemId: string(json, 'itemId', 'Auction'),
    basePrice: number(json, 'basePrice', 'Auction'),
    currentPrice: number(json, 'currentPrice', 'Auction'),
    winningBid: winningBid === null ? null : parseBid(winningBid),
    participants: list(field(json, 'participants', 'Auction'), 'Auction.participants').map((participant) =>
      parseUserSummary(participant, 'Auction.participants[]'),
    ),
    endsAt: string(json, 'endsAt', 'Auction'),
    status: oneOf(json, 'status', AUCTION_STATUSES, 'Auction'),
  };
}

// rest.md §3.2 · respuesta de POST /auctions/{auctionId}/bids
export function parsePlacedBid(value: unknown): PlacedBid {
  const json = object(value, 'PlacedBid');
  return {
    bid: parseBid(field(json, 'bid', 'PlacedBid')),
    auction: parseAuction(field(json, 'auction', 'PlacedBid')),
    releasedReservationId: nullableString(json, 'releasedReservationId', 'PlacedBid'),
  };
}

const MOVEMENT_TYPES: readonly MovementType[] = ['DEPOSIT', 'RESERVE', 'REFUND', 'CHARGE'];

function parseMovement(value: unknown): WalletMovement {
  const json = object(value, 'WalletMovement');
  return {
    id: string(json, 'id', 'WalletMovement'),
    type: oneOf(json, 'type', MOVEMENT_TYPES, 'WalletMovement'),
    amount: number(json, 'amount', 'WalletMovement'),
    auctionId: nullableString(json, 'auctionId', 'WalletMovement'),
    createdAt: string(json, 'createdAt', 'WalletMovement'),
  };
}

// rest.md §2 · Wallet
export function parseWallet(value: unknown): Wallet {
  const json = object(value, 'Wallet');
  return {
    userId: string(json, 'userId', 'Wallet'),
    available: number(json, 'available', 'Wallet'),
    reserved: number(json, 'reserved', 'Wallet'),
    movements: list(field(json, 'movements', 'Wallet'), 'Wallet.movements').map(parseMovement),
  };
}

const RESERVATION_STATUSES: readonly ReservationStatus[] = ['ACTIVE', 'RELEASED', 'CHARGED'];

// rest.md §2 · Reservation
export function parseReservation(value: unknown): Reservation {
  const json = object(value, 'Reservation');
  return {
    id: string(json, 'id', 'Reservation'),
    userId: string(json, 'userId', 'Reservation'),
    auctionId: string(json, 'auctionId', 'Reservation'),
    amount: number(json, 'amount', 'Reservation'),
    status: oneOf(json, 'status', RESERVATION_STATUSES, 'Reservation'),
    createdAt: string(json, 'createdAt', 'Reservation'),
  };
}

// rest.md §2 · respuesta de POST /users/{userId}/wallet/reservations
export function parseReservationResult(value: unknown): ReservationResult {
  const json = object(value, 'ReservationResult');
  return {
    reservation: parseReservation(field(json, 'reservation', 'ReservationResult')),
    wallet: parseWallet(field(json, 'wallet', 'ReservationResult')),
  };
}

const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['PENDING', 'CONFIRMED'];

// rest.md §5 · Delivery
export function parseDelivery(value: unknown): Delivery {
  const json = object(value, 'Delivery');
  return {
    id: string(json, 'id', 'Delivery'),
    auctionId: string(json, 'auctionId', 'Delivery'),
    itemId: string(json, 'itemId', 'Delivery'),
    winnerId: string(json, 'winnerId', 'Delivery'),
    amount: number(json, 'amount', 'Delivery'),
    status: oneOf(json, 'status', DELIVERY_STATUSES, 'Delivery'),
    createdAt: string(json, 'createdAt', 'Delivery'),
    confirmedAt: nullableString(json, 'confirmedAt', 'Delivery'),
  };
}

const NOTIFICATION_TYPES: readonly NotificationType[] = ['WELCOME', 'OUTBID', 'AUCTION_WON', 'AUCTION_LOST'];

// rest.md §6 · Notification
export function parseNotification(value: unknown): Notification {
  const json = object(value, 'Notification');
  return {
    id: string(json, 'id', 'Notification'),
    userId: string(json, 'userId', 'Notification'),
    type: oneOf(json, 'type', NOTIFICATION_TYPES, 'Notification'),
    message: string(json, 'message', 'Notification'),
    auctionId: nullableString(json, 'auctionId', 'Notification'),
    createdAt: string(json, 'createdAt', 'Notification'),
  };
}

// rest.md §4 · Item
export function parseItem(value: unknown): Item {
  const json = object(value, 'Item');
  return {
    id: string(json, 'id', 'Item'),
    name: string(json, 'name', 'Item'),
    description: nullableString(json, 'description', 'Item'),
    category: nullableString(json, 'category', 'Item'),
    images: stringList(json, 'images', 'Item'),
    documents: stringList(json, 'documents', 'Item'),
    basePrice: number(json, 'basePrice', 'Item'),
  };
}

// Para las consultas en lote: la respuesta es una lista y solo trae lo pedido.
export function parseListOf<T>(parse: (value: unknown) => T, keyOf: (entry: T) => string, requested: string[]) {
  return (value: unknown): T[] => {
    const entries = list(value, 'la respuesta').map(parse);
    const unexpected = entries.map(keyOf).filter((key) => !requested.includes(key));
    if (unexpected.length > 0) {
      throw new ContractError(`la respuesta trae ids no pedidos (${unexpected.slice(0, 3).join(', ')}): el filtro no se aplicó`);
    }
    return entries;
  };
}

export function parseList<T>(parse: (value: unknown) => T) {
  return (value: unknown): T[] => list(value, 'la respuesta').map(parse);
}
