import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/core/errors.js';
import { createGatewayPubSub } from '../../src/core/pubsub.js';
import { MockItemClient } from '../../src/infrastructure/clients/mock/item.mock.js';
import type { Auction, AuctionClient, Bid, PlacedBid } from '../../src/modules/auctions/index.js';
import { AuctionsService } from '../../src/modules/auctions/index.js';
import { CatalogService } from '../../src/modules/catalog/index.js';
import type { UserClient } from '../../src/modules/users/index.js';
import type { Reservation, WalletClient } from '../../src/modules/wallet/index.js';

// Saga de placeBid (rest.md §3.4) con clientes falsos para forzar los casos que los mocks no dan:
// tiempo agotado, liberación que falla y reserva anterior del mismo usuario.

const USER = { id: '7', name: 'Ana', email: 'ana@correo.com', role: 'comprador', createdAt: '2026-10-09T14:00:00Z' };
const RESERVATION: Reservation = {
  id: '305',
  userId: '7',
  auctionId: '12',
  amount: 130000,
  status: 'ACTIVE',
  createdAt: '2026-11-03T10:00:00Z',
};
const BID: Bid = { id: '56', amount: 130000, bidder: { id: '7', name: 'Ana' }, createdAt: '2026-11-03T10:00:00Z' };
const AUCTION: Auction = {
  id: '12',
  itemId: 'item-1',
  basePrice: 100000,
  currentPrice: 130000,
  winningBid: BID,
  participants: [{ id: '7', name: 'Ana' }],
  endsAt: '2026-11-10T00:00:00Z',
  status: 'OPEN',
};
const PLACED: PlacedBid = { bid: BID, auction: AUCTION, releasedReservationId: null };

function setup() {
  const wallet = {
    getWallet: vi.fn(),
    deposit: vi.fn(),
    reserve: vi.fn<WalletClient['reserve']>().mockResolvedValue({
      reservation: RESERVATION,
      wallet: { userId: '7', available: 0, reserved: 130000, movements: [] },
    }),
    releaseReservation: vi.fn<WalletClient['releaseReservation']>().mockResolvedValue({ ...RESERVATION, status: 'RELEASED' }),
  } satisfies WalletClient;
  const auctions = {
    getAuctionsByItemIds: vi.fn(),
    getAuctionsByIds: vi.fn<AuctionClient['getAuctionsByIds']>().mockResolvedValue([]),
    createAuction: vi.fn(),
    placeBid: vi.fn<AuctionClient['placeBid']>().mockResolvedValue(PLACED),
  } satisfies AuctionClient;
  const users = {
    createUser: vi.fn(),
    verifyCredentials: vi.fn(),
    getUser: vi.fn<UserClient['getUser']>().mockResolvedValue(USER),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  } satisfies UserClient;
  const pubsub = createGatewayPubSub();
  const publish = vi.spyOn(pubsub, 'publish');
  const service = new AuctionsService(auctions, new CatalogService(new MockItemClient()), pubsub, wallet, users);
  return { service, wallet, auctions, publish };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Saga de placeBid', () => {
  it('reserva, puja con la reserva y el nombre del usuario, y publica la subasta', async () => {
    const { service, wallet, auctions, publish } = setup();
    await expect(service.placeBid('7', '12', 130000)).resolves.toEqual(BID);
    expect(wallet.reserve).toHaveBeenCalledWith('7', '12', 130000);
    expect(auctions.placeBid).toHaveBeenCalledWith('12', {
      userId: '7',
      userName: 'Ana',
      amount: 130000,
      reservationId: '305',
    });
    expect(wallet.releaseReservation).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('auctionUpdated', '12', AUCTION);
  });

  it('si la reserva falla, no llama a subastas y sube el error de la billetera', async () => {
    const { service, wallet, auctions, publish } = setup();
    wallet.reserve.mockRejectedValue(new AppError('INSUFFICIENT_FUNDS', 'Sin saldo'));
    await expect(service.placeBid('7', '12', 130000)).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect(auctions.placeBid).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it.each(['BID_TOO_LOW', 'AUCTION_CLOSED', 'NOT_FOUND'] as const)(
    'si subastas responde %s, libera la reserva y sube ese error sin consultar la subasta',
    async (code) => {
      const { service, wallet, auctions, publish } = setup();
      auctions.placeBid.mockRejectedValue(new AppError(code, 'rechazada'));
      await expect(service.placeBid('7', '12', 130000)).rejects.toMatchObject({ code });
      expect(wallet.releaseReservation).toHaveBeenCalledWith('7', '305');
      expect(auctions.getAuctionsByIds).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it('si subastas no responde pero la puja quedó guardada, la Saga termina bien y no libera', async () => {
    const { service, wallet, auctions, publish } = setup();
    auctions.placeBid.mockRejectedValue(new AppError('INTERNAL', 'sin respuesta'));
    auctions.getAuctionsByIds.mockResolvedValue([AUCTION]);
    await expect(service.placeBid('7', '12', 130000)).resolves.toEqual(BID);
    expect(auctions.getAuctionsByIds).toHaveBeenCalledWith(['12']);
    expect(wallet.releaseReservation).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('auctionUpdated', '12', AUCTION);
  });

  it('si subastas no responde y la puja no quedó (otro va ganando), libera y sube INTERNAL', async () => {
    const { service, wallet, auctions, publish } = setup();
    auctions.placeBid.mockRejectedValue(new AppError('INTERNAL', 'sin respuesta'));
    auctions.getAuctionsByIds.mockResolvedValue([
      { ...AUCTION, winningBid: { ...BID, bidder: { id: '9', name: 'Luis' } } },
    ]);
    await expect(service.placeBid('7', '12', 130000)).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(wallet.releaseReservation).toHaveBeenCalledWith('7', '305');
    expect(publish).not.toHaveBeenCalled();
  });

  it('si tampoco se puede consultar la subasta, se toma como no guardada y libera', async () => {
    const { service, wallet, auctions } = setup();
    auctions.placeBid.mockRejectedValue(new AppError('INTERNAL', 'sin respuesta'));
    auctions.getAuctionsByIds.mockRejectedValue(new AppError('INTERNAL', 'caído'));
    await expect(service.placeBid('7', '12', 130000)).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(wallet.releaseReservation).toHaveBeenCalledWith('7', '305');
  });

  it('reintenta la liberación y, si falla 3 veces, sube el error original y lo deja en el log', async () => {
    const { service, wallet, auctions } = setup();
    auctions.placeBid.mockRejectedValue(new AppError('BID_TOO_LOW', 'baja'));
    wallet.releaseReservation.mockRejectedValue(new AppError('INTERNAL', 'billetera caída'));
    await expect(service.placeBid('7', '12', 130000)).rejects.toMatchObject({ code: 'BID_TOO_LOW' });
    expect(wallet.releaseReservation).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('la reserva 305 de 7 quedó sin liberar'),
      expect.anything(),
    );
  });

  it('si la liberación falla una vez y luego funciona, no deja nada en el log', async () => {
    const { service, wallet, auctions } = setup();
    auctions.placeBid.mockRejectedValue(new AppError('BID_TOO_LOW', 'baja'));
    wallet.releaseReservation.mockRejectedValueOnce(new AppError('INTERNAL', 'un tropiezo'));
    await expect(service.placeBid('7', '12', 130000)).rejects.toMatchObject({ code: 'BID_TOO_LOW' });
    expect(wallet.releaseReservation).toHaveBeenCalledTimes(2);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('si el usuario subió su propia puja, libera la reserva anterior que devuelve subastas', async () => {
    const { service, wallet, auctions } = setup();
    auctions.placeBid.mockResolvedValue({ ...PLACED, releasedReservationId: '301' });
    await expect(service.placeBid('7', '12', 130000)).resolves.toEqual(BID);
    expect(wallet.releaseReservation).toHaveBeenCalledWith('7', '301');
    expect(wallet.releaseReservation).not.toHaveBeenCalledWith('7', '305');
  });

  it('si no se puede liberar la reserva anterior, la puja igual se devuelve (ya quedó guardada)', async () => {
    const { service, wallet, auctions, publish } = setup();
    auctions.placeBid.mockResolvedValue({ ...PLACED, releasedReservationId: '301' });
    wallet.releaseReservation.mockRejectedValue(new AppError('INTERNAL', 'billetera caída'));
    await expect(service.placeBid('7', '12', 130000)).resolves.toEqual(BID);
    expect(publish).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('la reserva 301'), expect.anything());
  });
});
