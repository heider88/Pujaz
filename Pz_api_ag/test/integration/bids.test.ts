import { describe, expect, it, vi } from 'vitest';
import { buildGateway, createMockClients } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';

const config = loadConfig({ JWT_SECRET: 'x'.repeat(32), USE_MOCKS: 'true' });

// Datos de los clientes falsos: la subasta 12 (reloj) está abierta y va ganando Ana (7) con 120000;
// la 13 (lámpara) está cerrada.
const OPEN_AUCTION = '12';
const CLOSED_AUCTION = '13';
const ANA = '7';

function setup() {
  const clients = createMockClients();
  const { yoga, tokenService } = buildGateway(config, clients);

  async function graphql(query: string, variables?: Record<string, unknown>, token?: string) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token !== undefined) headers.authorization = `Bearer ${token}`;
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<any>;
  }

  // Un usuario nuevo con saldo, para pujar contra Ana.
  async function newBidder(name: string, balance: number) {
    const { data } = await graphql(
      `mutation ($input: RegisterInput!) { register(input: $input) { token user { id } } }`,
      { input: { name, email: `${name.toLowerCase()}@correo.com`, password: 'Secreto123', role: 'comprador' } },
    );
    const { token, user } = data.register;
    if (balance > 0) await graphql(
        'mutation ($a: Float!) { deposit(amount: $a, promoCode: "PROMO2026") { available } }',
        { a: balance },
        token,
      );
    return { token, id: user.id as string };
  }

  return { graphql, clients, newBidder, tokenFor: (userId: string, role = 'comprador') => tokenService.sign(userId, role) };
}

const BID = `mutation ($auctionId: ID!, $amount: Float!) {
  placeBid(auctionId: $auctionId, amount: $amount) { id amount createdAt bidder { id name } }
}`;
const WALLET = `{ wallet { available reserved movements { type amount auction { id } } } }`;

describe('pujas', () => {
  it('1. placeBid sin token devuelve UNAUTHENTICATED y no llama al MS', async () => {
    const { graphql, clients } = setup();
    const spy = vi.spyOn(clients.auctionClient, 'placeBid');
    const { errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 });
    expect(errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(spy).not.toHaveBeenCalled();
  });

  it('2. una puja válida devuelve amount, bidder y createdAt, y reserva el saldo', async () => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 500000);
    const { data, errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 }, luis.token);
    expect(errors).toBeUndefined();
    expect(data.placeBid).toMatchObject({ amount: 130000, bidder: { id: luis.id, name: 'Luis' } });
    expect(Date.parse(data.placeBid.createdAt)).not.toBeNaN();

    const { data: wallet } = await graphql(WALLET, undefined, luis.token);
    expect(wallet.wallet).toMatchObject({ available: 370000, reserved: 130000 });
    expect(wallet.wallet.movements[0]).toEqual({ type: 'RESERVE', amount: 130000, auction: { id: OPEN_AUCTION } });
  });

  it('2b. al superar la puja, el ganador anterior recibe su reintegro', async () => {
    const { graphql, newBidder, tokenFor } = setup();
    const luis = await newBidder('Luis', 500000);
    await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 }, luis.token);

    const { data } = await graphql(WALLET, undefined, await tokenFor(ANA));
    expect(data.wallet).toMatchObject({ available: 500000, reserved: 0 });
    expect(data.wallet.movements[0]).toEqual({ type: 'REFUND', amount: 120000, auction: { id: OPEN_AUCTION } });
  });

  it('2c. la subasta queda con el nuevo precio, la puja ganadora y los participantes', async () => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 500000);
    await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 }, luis.token);
    const { data } = await graphql(
      '{ auction(itemId: "64f1c0aa9b1e8a0012ab34cd") { currentPrice winningBid { amount bidder { name } } participants { name } } }',
    );
    expect(data.auction.currentPrice).toBe(130000);
    expect(data.auction.winningBid).toEqual({ amount: 130000, bidder: { name: 'Luis' } });
    expect(data.auction.participants.map((p: { name: string }) => p.name)).toContain('Luis');
  });

  it.each([120000, 100, 120050])('3. una puja de %s (no supera el precio actual en 100) devuelve BID_TOO_LOW', async (amount) => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 500000);
    const { errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount }, luis.token);
    expect(errors[0].extensions.code).toBe('BID_TOO_LOW');
  });

  it('3b. una puja que supera el precio actual en exactamente 100 se acepta', async () => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 500000);
    const { data, errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 120100 }, luis.token);
    expect(errors).toBeUndefined();
    expect(data.placeBid.amount).toBe(120100);
  });

  it('4. una puja en una subasta cerrada devuelve AUCTION_CLOSED', async () => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 500000);
    const { errors } = await graphql(BID, { auctionId: CLOSED_AUCTION, amount: 300000 }, luis.token);
    expect(errors[0].extensions.code).toBe('AUCTION_CLOSED');
  });

  it('5. una puja sin saldo suficiente devuelve INSUFFICIENT_FUNDS y no reserva nada', async () => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 100000);
    const { errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 }, luis.token);
    expect(errors[0].extensions.code).toBe('INSUFFICIENT_FUNDS');
    const { data } = await graphql(WALLET, undefined, luis.token);
    expect(data.wallet).toMatchObject({ available: 100000, reserved: 0 });
  });

  it('5b. quien va ganando sube su puja con saldo disponible: se reserva lo nuevo y se libera lo anterior', async () => {
    const { graphql, tokenFor } = setup();
    const token = await tokenFor(ANA);
    // Ana tiene 380000 disponibles y 120000 reservados en esta subasta (rest.md §9.1).
    const { errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 300000 }, token);
    expect(errors).toBeUndefined();

    const { data } = await graphql(WALLET, undefined, token);
    expect(data.wallet).toMatchObject({ available: 200000, reserved: 300000 });
    expect(data.wallet.movements.slice(0, 2)).toEqual([
      { type: 'REFUND', amount: 120000, auction: { id: OPEN_AUCTION } },
      { type: 'RESERVE', amount: 300000, auction: { id: OPEN_AUCTION } },
    ]);
  });

  it('5c. para subir su puja necesita el monto nuevo completo disponible (no cuenta lo ya reservado)', async () => {
    const { graphql, tokenFor } = setup();
    const token = await tokenFor(ANA);
    const { errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 500000 }, token);
    expect(errors[0].extensions.code).toBe('INSUFFICIENT_FUNDS');
    const { data } = await graphql(WALLET, undefined, token);
    expect(data.wallet).toMatchObject({ available: 380000, reserved: 120000 });
  });

  it('6. una subasta inexistente devuelve NOT_FOUND', async () => {
    const { graphql, tokenFor } = setup();
    const { errors } = await graphql(BID, { auctionId: '999', amount: 1000 }, await tokenFor(ANA));
    expect(errors[0].extensions.code).toBe('NOT_FOUND');
  });

  it('11. el userId de la puja sale del token', async () => {
    const { graphql, clients, newBidder } = setup();
    const spy = vi.spyOn(clients.auctionClient, 'placeBid');
    const luis = await newBidder('Luis', 500000);
    await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 }, luis.token);
    expect(spy).toHaveBeenCalledWith(OPEN_AUCTION, {
      userId: luis.id,
      userName: 'Luis',
      amount: 130000,
      reservationId: expect.any(String),
    });
  });
});

describe('Saga de la puja: compensación', () => {
  it.each([
    ['BID_TOO_LOW', OPEN_AUCTION, 120000],
    ['AUCTION_CLOSED', CLOSED_AUCTION, 300000],
    ['NOT_FOUND', '999', 130000],
  ])('si subastas rechaza la puja (%s), se libera la reserva y el saldo queda como estaba', async (code, auctionId, amount) => {
    const { graphql, newBidder } = setup();
    const luis = await newBidder('Luis', 500000);
    const { errors } = await graphql(BID, { auctionId, amount }, luis.token);
    expect(errors[0].extensions.code).toBe(code);

    const { data } = await graphql(WALLET, undefined, luis.token);
    expect(data.wallet).toMatchObject({ available: 500000, reserved: 0 });
    expect(data.wallet.movements.map((movement: { type: string }) => movement.type)).toEqual(['REFUND', 'RESERVE', 'DEPOSIT']);
  });

  it('si la billetera no tiene saldo, subastas no recibe la puja', async () => {
    const { graphql, clients, newBidder } = setup();
    const spy = vi.spyOn(clients.auctionClient, 'placeBid');
    const luis = await newBidder('Luis', 100000);
    const { errors } = await graphql(BID, { auctionId: OPEN_AUCTION, amount: 130000 }, luis.token);
    expect(errors[0].extensions.code).toBe('INSUFFICIENT_FUNDS');
    expect(spy).not.toHaveBeenCalled();
  });
});
