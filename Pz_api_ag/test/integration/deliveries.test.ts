import { describe, expect, it, vi } from 'vitest';
import { buildGateway, createMockClients } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';

const config = loadConfig({ JWT_SECRET: 'x'.repeat(32), USE_MOCKS: 'true' });

const ANA = '7';
const LUIS = '9';
// La entrega de Ana en delivery.mock.ts (subasta 14, que ganó con 60000).
const ANA_DELIVERY = '6726a1f0c3b2a90012ab0001';

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

const MY_DELIVERIES = `{
  myDeliveries { id amount status createdAt confirmedAt auction { id currentPrice status item { name } } }
}`;
const CONFIRM = `mutation ($id: ID!) { confirmDelivery(id: $id) { id status confirmedAt } }`;

describe('entregas', () => {
  it('myDeliveries sin token devuelve UNAUTHENTICATED', async () => {
    const { graphql } = setup();
    const { errors } = await graphql(MY_DELIVERIES);
    expect(errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('myDeliveries devuelve las entregas del usuario del token con su subasta y su pieza', async () => {
    const { graphql, tokenFor } = setup();
    const { data, errors } = await graphql(MY_DELIVERIES, undefined, await tokenFor(ANA));
    expect(errors).toBeUndefined();
    expect(data.myDeliveries).toEqual([
      {
        id: ANA_DELIVERY,
        amount: 60000,
        status: 'PENDING',
        createdAt: expect.any(String),
        confirmedAt: null,
        auction: { id: '14', currentPrice: 60000, status: 'CLOSED', item: { name: 'Moneda de oro de 1886' } },
      },
    ]);
  });

  it('myDeliveries pide al MS solo las entregas del usuario del token', async () => {
    const { graphql, clients, tokenFor } = setup();
    const spy = vi.spyOn(clients.deliveryClient, 'getDeliveries');
    const { data } = await graphql(MY_DELIVERIES, undefined, await tokenFor(LUIS));
    expect(spy).toHaveBeenCalledWith(LUIS);
    expect(data.myDeliveries).toEqual([]);
  });

  it('confirmDelivery pasa la entrega a CONFIRMED con su fecha', async () => {
    const { graphql, tokenFor } = setup();
    const token = await tokenFor(ANA);
    const { data, errors } = await graphql(CONFIRM, { id: ANA_DELIVERY }, token);
    expect(errors).toBeUndefined();
    expect(data.confirmDelivery).toEqual({ id: ANA_DELIVERY, status: 'CONFIRMED', confirmedAt: expect.any(String) });

    const after = await graphql(MY_DELIVERIES, undefined, token);
    expect(after.data.myDeliveries[0].status).toBe('CONFIRMED');
  });

  it('confirmar una entrega ya confirmada devuelve BAD_USER_INPUT', async () => {
    const { graphql, tokenFor } = setup();
    const token = await tokenFor(ANA);
    await graphql(CONFIRM, { id: ANA_DELIVERY }, token);
    const { errors } = await graphql(CONFIRM, { id: ANA_DELIVERY }, token);
    expect(errors[0].extensions.code).toBe('BAD_USER_INPUT');
  });

  it('confirmar la entrega de otro usuario devuelve NOT_FOUND y no la cambia', async () => {
    const { graphql, tokenFor } = setup();
    const { errors } = await graphql(CONFIRM, { id: ANA_DELIVERY }, await tokenFor(LUIS, 'vendedor'));
    expect(errors[0].extensions.code).toBe('NOT_FOUND');
    const { data } = await graphql(MY_DELIVERIES, undefined, await tokenFor(ANA));
    expect(data.myDeliveries[0].status).toBe('PENDING');
  });

  it('confirmDelivery sin token devuelve UNAUTHENTICATED', async () => {
    const { graphql } = setup();
    const { errors } = await graphql(CONFIRM, { id: ANA_DELIVERY });
    expect(errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
});
