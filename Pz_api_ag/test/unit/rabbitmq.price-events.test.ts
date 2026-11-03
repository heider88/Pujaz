import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeBrokerError, readPriceUpdated } from '../../src/infrastructure/events/rabbitmq.price-events.js';

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readPriceUpdated', () => {
  it('lee auctionId como número (lo que publica hoy Pz_subastas_cl)', () => {
    expect(readPriceUpdated('PrecioActualizado', json({ auctionId: 12, price: 130000 }))).toBe('12');
  });

  it('lee auctionId como texto (contrato de eventos)', () => {
    expect(readPriceUpdated('PrecioActualizado', json({ auctionId: '12', currentPrice: 130000 }))).toBe('12');
  });

  it('otros eventos del exchange se ignoran sin dejar nada en el log', () => {
    expect(readPriceUpdated('PujaSuperada', json({ auctionId: 12 }))).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('un JSON roto se descarta y queda en el log', () => {
    expect(readPriceUpdated('PrecioActualizado', Buffer.from('{no es json'))).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('JSON inválido'));
  });

  it.each([{}, { auctionId: '' }, { auctionId: null }, { auctionId: true }, 'texto'])(
    'sin un auctionId válido (%j) se descarta y queda en el log',
    (body) => {
      expect(readPriceUpdated('PrecioActualizado', json(body))).toBeNull();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('sin auctionId válido'));
    },
  );
});

describe('describeBrokerError', () => {
  it('con mensaje, devuelve el mensaje', () => {
    expect(describeBrokerError(new Error('ACCESS_REFUSED'))).toBe('ACCESS_REFUSED');
  });

  it('con el mensaje vacío, devuelve su código', () => {
    expect(describeBrokerError(Object.assign(new Error(''), { code: 'ECONNREFUSED' }))).toBe('ECONNREFUSED');
  });

  it('un AggregateError sin mensaje ni código usa el código de su primer error', () => {
    const inner = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5672'), { code: 'ECONNREFUSED' });
    expect(describeBrokerError(new AggregateError([inner], ''))).toBe('ECONNREFUSED');
  });

  it('sin mensaje ni código, devuelve el nombre del error', () => {
    expect(describeBrokerError(new TypeError(''))).toBe('TypeError');
  });
});
