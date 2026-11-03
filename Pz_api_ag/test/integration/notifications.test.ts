import { describe, expect, it, vi } from 'vitest';
import { buildGateway, createMockClients } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';

const config = loadConfig({ JWT_SECRET: 'x'.repeat(32), USE_MOCKS: 'true' });

const ANA = '7';
const LUIS = '9';

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

  return { graphql, clients, tokenFor: (userId: string, role = 'comprador') => tokenService.sign(userId, role) };
}

const MY_NOTIFICATIONS = `{ myNotifications { id type message createdAt auction { id item { name } } } }`;

describe('notificaciones', () => {
  it('myNotifications sin token devuelve UNAUTHENTICATED', async () => {
    const { graphql } = setup();
    const { errors } = await graphql(MY_NOTIFICATIONS);
    expect(errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('devuelve las notificaciones del usuario, de la más reciente a la más antigua, con su subasta', async () => {
    const { graphql, tokenFor } = setup();
    const { data, errors } = await graphql(MY_NOTIFICATIONS, undefined, await tokenFor(ANA));
    expect(errors).toBeUndefined();
    expect(data.myNotifications.map((notification: any) => notification.type)).toEqual(['AUCTION_WON', 'WELCOME']);
    expect(data.myNotifications[0].auction).toEqual({ id: '14', item: { name: 'Moneda de oro de 1886' } });
  });

  it('WELCOME no tiene subasta: auction es null', async () => {
    const { graphql, tokenFor } = setup();
    const { data } = await graphql(MY_NOTIFICATIONS, undefined, await tokenFor(ANA));
    const welcome = data.myNotifications.find((notification: any) => notification.type === 'WELCOME');
    expect(welcome.auction).toBeNull();
  });

  it('las subastas de todas las notificaciones salen en una sola llamada al MS', async () => {
    const { graphql, clients, tokenFor } = setup();
    const spy = vi.spyOn(clients.auctionClient, 'getAuctionsByIds');
    const { data } = await graphql(MY_NOTIFICATIONS, undefined, await tokenFor(LUIS, 'vendedor'));
    expect(data.myNotifications.map((notification: any) => notification.type)).toEqual(['OUTBID', 'AUCTION_LOST']);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].sort()).toEqual(['12', '14']);
  });
});
