import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpAuctionClient } from '../../src/infrastructure/clients/http/auction.http.js';
import { HttpDeliveryClient } from '../../src/infrastructure/clients/http/delivery.http.js';
import { HttpItemClient } from '../../src/infrastructure/clients/http/item.http.js';
import { HttpNotificationClient } from '../../src/infrastructure/clients/http/notification.http.js';
import { HttpUserClient } from '../../src/infrastructure/clients/http/user.http.js';
import { HttpWalletClient } from '../../src/infrastructure/clients/http/wallet.http.js';
import { HttpClient } from '../../src/infrastructure/http/http-client.js';

// Respuestas copiadas de los MS reales (10 de octubre) y del ejemplo de rest.md.
const MS_USER = { id: '4', name: 'Prueba', email: 'prueba@correo.com', role: 'comprador', status: 'activa' };
const CONTRACT_USER = { id: '7', name: 'Ana', email: 'ana@correo.com', role: 'comprador', createdAt: '2026-10-09T14:00:00Z' };
const MS_WALLET = {
  userId: '4',
  available: 350,
  reserved: 150,
  movements: [
    { id: '7', type: 'RESERVE', amount: 150, auctionId: null, createdAt: '2026-10-11T00:22:40.361263Z' },
    { id: '6', type: 'DEPOSIT', amount: 500, auctionId: null, createdAt: '2026-10-11T00:22:40.353639Z' },
  ],
};
const MS_AUCTION = {
  id: '1',
  itemId: '60d5ec49f1b2c3d4e5f60001',
  basePrice: 100,
  currentPrice: 150,
  winningBid: { id: '1', amount: 150, bidder: { id: '4', name: 'Prueba' }, createdAt: '2026-10-11T00:22:40Z' },
  participants: [{ id: '4', name: 'Prueba' }],
  endsAt: '2026-10-14T00:22:22Z',
  status: 'OPEN',
};
// Ejemplos de rest.md v3 (§2, §3.2, §5 y §6).
const NEW_BID = { userId: '4', userName: 'Prueba', amount: 150, reservationId: '305' };
const RESERVATION = { id: '305', userId: '7', auctionId: '12', amount: 130000, status: 'ACTIVE', createdAt: '2026-10-09T14:10:00Z' };
const DELIVERY = {
  id: '6726a1f0c3b2a90012ab0001',
  auctionId: '12',
  itemId: '64f1c0aa9b1e8a0012ab34cd',
  winnerId: '7',
  amount: 150000,
  status: 'PENDING',
  createdAt: '2026-11-02T20:00:00Z',
  confirmedAt: null,
};
const NOTIFICATION = {
  id: 'b7e1c2d4-9f0a-4c3b-8e2d-5a6f7c8d9e01',
  userId: '9',
  type: 'OUTBID',
  message: 'Tu puja fue superada',
  auctionId: '12',
  createdAt: '2026-11-02T14:10:00Z',
};
const MS_ITEM = { id: '60d5ec49f1b2c3d4e5f60001', name: 'Reloj', description: 'De bolsillo' };
const CONTRACT_ITEM = { ...MS_ITEM, category: 'Relojes', images: [], documents: [], basePrice: 100000 };

let fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;

function willRespond(status: number, body?: unknown) {
  fetchFn.mockResolvedValueOnce(new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

function lastUrl(): string {
  return String(fetchFn.mock.calls.at(-1)![0]);
}

function http() {
  return new HttpClient('MS prueba', 'http://ms', { fetchFn });
}

beforeEach(() => {
  fetchFn = vi.fn<typeof fetch>();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HttpUserClient', () => {
  it('un usuario sin createdAt no cumple el contrato: INTERNAL', async () => {
    willRespond(200, MS_USER);
    await expect(new HttpUserClient(http()).getUser('4')).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('falta User.createdAt'));
  });

  it('un usuario completo pasa, sin los campos que el contrato no tiene', async () => {
    willRespond(201, { ...CONTRACT_USER, status: 'activa' });
    const user = await new HttpUserClient(http()).createUser({ name: 'Ana', email: 'ana@correo.com', password: 'secreto123' });
    expect(user).toEqual(CONTRACT_USER);
    expect(lastUrl()).toBe('http://ms/users');
  });

  it('un usuario con status "inactiva" (borrado) se trata como NOT_FOUND', async () => {
    willRespond(200, { ...MS_USER, name: 'Usuario Eliminado', status: 'inactiva' });
    await expect(new HttpUserClient(http()).getUser('4')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('updateUser envía solo los cambios por PATCH', async () => {
    willRespond(200, CONTRACT_USER);
    await new HttpUserClient(http()).updateUser('7', { name: 'Ana' });
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'PATCH', body: '{"name":"Ana"}' });
  });

  it('deleteUser acepta el 204 del MS', async () => {
    willRespond(204);
    await expect(new HttpUserClient(http()).deleteUser('4')).resolves.toBeUndefined();
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'DELETE' });
  });

  it('los errores del MS conservan su código', async () => {
    willRespond(401, { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    await expect(
      new HttpUserClient(http()).verifyCredentials({ email: 'ana@correo.com', password: 'x' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

describe('HttpWalletClient', () => {
  it('la billetera del MS cumple el contrato', async () => {
    willRespond(200, MS_WALLET);
    await expect(new HttpWalletClient(http()).getWallet('4')).resolves.toEqual(MS_WALLET);
    expect(lastUrl()).toBe('http://ms/users/4/wallet');
  });

  it('deposit envía el monto y el promoCode, y conserva BAD_USER_INPUT', async () => {
    willRespond(400, { code: 'BAD_USER_INPUT', message: 'Invalid input' });
    await expect(new HttpWalletClient(http()).deposit('4', 0, 'PROMO2026')).rejects.toMatchObject({
      code: 'BAD_USER_INPUT',
    });
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{"amount":0,"promoCode":"PROMO2026"}' });
    expect(lastUrl()).toBe('http://ms/users/4/wallet/deposits');
  });

  it('acepta el movimiento CHARGE (cobro al ganador)', async () => {
    const charged = { ...MS_WALLET, movements: [{ ...MS_WALLET.movements[0]!, type: 'CHARGE', auctionId: '12' }] };
    willRespond(200, charged);
    await expect(new HttpWalletClient(http()).getWallet('4')).resolves.toEqual(charged);
  });

  it('reserve envía auctionId y amount, y valida la reserva y la billetera', async () => {
    willRespond(201, { reservation: RESERVATION, wallet: MS_WALLET });
    await expect(new HttpWalletClient(http()).reserve('7', '12', 130000)).resolves.toEqual({
      reservation: RESERVATION,
      wallet: MS_WALLET,
    });
    expect(lastUrl()).toBe('http://ms/users/7/wallet/reservations');
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{"auctionId":"12","amount":130000}' });
  });

  it('reserve conserva INSUFFICIENT_FUNDS', async () => {
    willRespond(422, { code: 'INSUFFICIENT_FUNDS', message: 'Saldo insuficiente' });
    await expect(new HttpWalletClient(http()).reserve('7', '12', 1e9)).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
  });

  it('una reserva con un status fuera del contrato sale INTERNAL', async () => {
    willRespond(201, { reservation: { ...RESERVATION, status: 'PENDING' }, wallet: MS_WALLET });
    await expect(new HttpWalletClient(http()).reserve('7', '12', 130000)).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('releaseReservation llama a la reserva del usuario y valida la respuesta', async () => {
    willRespond(200, { ...RESERVATION, status: 'RELEASED' });
    await expect(new HttpWalletClient(http()).releaseReservation('7', '305')).resolves.toMatchObject({ status: 'RELEASED' });
    expect(lastUrl()).toBe('http://ms/users/7/wallet/reservations/305/release');
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'POST' });
  });
});

describe('HttpDeliveryClient', () => {
  it('pide las entregas del ganador con el id codificado', async () => {
    willRespond(200, [DELIVERY]);
    await expect(new HttpDeliveryClient(http()).getDeliveries('7 8')).resolves.toEqual([DELIVERY]);
    expect(lastUrl()).toBe('http://ms/deliveries?winnerId=7%208');
  });

  it('confirmDelivery envía winnerId y valida la entrega confirmada', async () => {
    const confirmed = { ...DELIVERY, status: 'CONFIRMED', confirmedAt: '2026-11-03T10:00:00Z' };
    willRespond(200, confirmed);
    await expect(new HttpDeliveryClient(http()).confirmDelivery(DELIVERY.id, '7')).resolves.toEqual(confirmed);
    expect(lastUrl()).toBe(`http://ms/deliveries/${DELIVERY.id}/confirm`);
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{"winnerId":"7"}' });
  });

  it('el 404 del MS llega como NOT_FOUND', async () => {
    willRespond(404, { code: 'NOT_FOUND', message: 'No existe' });
    await expect(new HttpDeliveryClient(http()).confirmDelivery('x', '7')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('HttpNotificationClient', () => {
  it('pide las notificaciones del usuario y valida la lista', async () => {
    willRespond(200, [NOTIFICATION, { ...NOTIFICATION, id: 'n2', type: 'WELCOME', auctionId: null }]);
    const notifications = await new HttpNotificationClient(http()).getNotifications('9');
    expect(notifications.map((notification) => notification.type)).toEqual(['OUTBID', 'WELCOME']);
    expect(lastUrl()).toBe('http://ms/notificaciones/9');
  });

  it('un type que no está en el contrato sale INTERNAL', async () => {
    willRespond(200, [{ ...NOTIFICATION, type: 'PujaSuperada' }]);
    await expect(new HttpNotificationClient(http()).getNotifications('9')).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('el formato viejo del worker (user_id, event) no cumple el contrato: INTERNAL', async () => {
    willRespond(200, [{ user_id: '9', event: 'PujaSuperada', auction_id: '12', message: 'x', received_at: 'y' }]);
    await expect(new HttpNotificationClient(http()).getNotifications('9')).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});

describe('HttpAuctionClient', () => {
  it('pide las subastas de varios ítems en una sola llamada', async () => {
    willRespond(200, [MS_AUCTION]);
    const auctions = await new HttpAuctionClient(http()).getAuctionsByItemIds([MS_AUCTION.itemId, 'otro']);
    expect(auctions).toEqual([MS_AUCTION]);
    expect(lastUrl()).toBe(`http://ms/auctions?itemIds=${MS_AUCTION.itemId},otro`);
  });

  it('una consulta en lote que responde null (slice vacío de Go) es una lista vacía', async () => {
    willRespond(200, null);
    await expect(new HttpAuctionClient(http()).getAuctionsByItemIds(['sin-subasta'])).resolves.toEqual([]);
  });

  it('una consulta en lote que no responde una lista sale INTERNAL', async () => {
    willRespond(200, {});
    await expect(new HttpAuctionClient(http()).getAuctionsByIds(['1'])).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('no es una lista'));
  });

  it('si el MS no tiene la consulta en lote (redirección), sale INTERNAL', async () => {
    willRespond(307);
    await expect(new HttpAuctionClient(http()).getAuctionsByIds(['1'])).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('placeBid envía userId, userName, amount y reservationId, y valida la respuesta del MS', async () => {
    willRespond(201, { bid: MS_AUCTION.winningBid, auction: MS_AUCTION, releasedReservationId: null });
    const placed = await new HttpAuctionClient(http()).placeBid('1', NEW_BID);
    expect(placed).toEqual({ bid: MS_AUCTION.winningBid, auction: MS_AUCTION, releasedReservationId: null });
    expect(lastUrl()).toBe('http://ms/auctions/1/bids');
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({
      method: 'POST',
      body: '{"userId":"4","userName":"Prueba","amount":150,"reservationId":"305"}',
    });
  });

  it('placeBid conserva releasedReservationId cuando el usuario subió su propia puja', async () => {
    willRespond(201, { bid: MS_AUCTION.winningBid, auction: MS_AUCTION, releasedReservationId: '301' });
    await expect(new HttpAuctionClient(http()).placeBid('1', NEW_BID)).resolves.toMatchObject({
      releasedReservationId: '301',
    });
  });

  it('una respuesta de placeBid sin releasedReservationId no cumple el contrato v3: INTERNAL', async () => {
    willRespond(201, { bid: MS_AUCTION.winningBid, auction: MS_AUCTION });
    await expect(new HttpAuctionClient(http()).placeBid('1', NEW_BID)).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('falta PlacedBid.releasedReservationId'));
  });

  it.each([
    [409, 'BID_TOO_LOW'],
    [409, 'AUCTION_CLOSED'],
    [404, 'NOT_FOUND'],
  ])('placeBid conserva el error %s %s del MS', async (status, code) => {
    willRespond(status, { code, message: 'x' });
    await expect(new HttpAuctionClient(http()).placeBid('1', NEW_BID)).rejects.toMatchObject({ code });
  });

  it('una lista vacía no llama al MS', async () => {
    await expect(new HttpAuctionClient(http()).getAuctionsByIds([])).resolves.toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('createAuction envía itemId, basePrice y endsAt, y valida la subasta que responde el MS', async () => {
    const created = { ...MS_AUCTION, currentPrice: 100, winningBid: null, participants: [] };
    willRespond(201, created);
    const input = { itemId: MS_AUCTION.itemId, basePrice: 100, endsAt: '2099-01-01T00:00:00Z' };
    await expect(new HttpAuctionClient(http()).createAuction(input)).resolves.toEqual(created);
    expect(lastUrl()).toBe('http://ms/auctions');
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
  });

  it('createAuction conserva el BAD_USER_INPUT del MS', async () => {
    willRespond(400, { code: 'BAD_USER_INPUT', message: 'Invalid auction parameters' });
    await expect(
      new HttpAuctionClient(http()).createAuction({ itemId: 'x', basePrice: 0, endsAt: '2099-01-01T00:00:00Z' }),
    ).rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
  });
});

describe('HttpItemClient', () => {
  it('un ítem sin basePrice, category, images ni documents no cumple el contrato: INTERNAL', async () => {
    willRespond(200, [MS_ITEM]);
    await expect(new HttpItemClient(http()).searchItems()).rejects.toMatchObject({ code: 'INTERNAL' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('falta Item.category'));
  });

  it('un ítem completo pasa', async () => {
    willRespond(200, CONTRACT_ITEM);
    await expect(new HttpItemClient(http()).getItem(MS_ITEM.id)).resolves.toEqual(CONTRACT_ITEM);
  });

  it('busca con el texto codificado en la URL', async () => {
    willRespond(200, []);
    await new HttpItemClient(http()).searchItems('reloj de oro');
    expect(lastUrl()).toBe('http://ms/items?search=reloj%20de%20oro');
  });

  it('el 404 de FastAPI llega como NOT_FOUND', async () => {
    willRespond(404, { detail: 'Item not found' });
    await expect(new HttpItemClient(http()).getItem('x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('si ?ids= devuelve ítems no pedidos (el MS ignora el filtro), sale INTERNAL', async () => {
    willRespond(200, [CONTRACT_ITEM, { ...CONTRACT_ITEM, id: 'otro' }]);
    await expect(new HttpItemClient(http()).getItemsByIds([CONTRACT_ITEM.id])).rejects.toMatchObject({
      code: 'INTERNAL',
    });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ids no pedidos'));
  });

  it('createItem envía el ítem y valida el ítem que responde el MS', async () => {
    willRespond(201, CONTRACT_ITEM);
    const input = { name: 'Reloj', description: 'De bolsillo', basePrice: 100000 };
    await expect(new HttpItemClient(http()).createItem(input)).resolves.toEqual(CONTRACT_ITEM);
    expect(lastUrl()).toBe('http://ms/items');
    expect(fetchFn.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
  });

  it('el 422 de FastAPI en createItem (por ejemplo, sin descripción) llega como BAD_USER_INPUT', async () => {
    willRespond(422, { detail: [{ loc: ['body', 'description'], msg: 'Field required' }] });
    await expect(new HttpItemClient(http()).createItem({ name: 'Radio', basePrice: 1000 })).rejects.toMatchObject({
      code: 'BAD_USER_INPUT',
    });
  });
});
