import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config.js';

const VALID_SECRET = 'x'.repeat(32);
const MS_URLS = {
  MS_USUARIOS_URL: 'http://pz-usuarios-cl:8080',
  MS_SUBASTAS_URL: 'http://pz-subastas-cl:8081',
  MS_BILLETERA_URL: 'http://pz-billetera-cl:8082',
  MS_CATALOGO_URL: 'http://pz-catalogo-cl:8000',
  MS_POSTPUJA_URL: 'http://pz-postpuja-cl:8000',
  MS_NOTIFICACIONES_URL: 'http://pz-notificaciones-cl:8000',
  RABBITMQ_URL: 'amqp://guest:guest@pz-eventos-mq:5672/',
};

describe('loadConfig', () => {
  it('falla si falta JWT_SECRET', () => {
    expect(() => loadConfig({ USE_MOCKS: 'true' })).toThrow(ConfigError);
    expect(() => loadConfig({ USE_MOCKS: 'true' })).toThrow(/JWT_SECRET/);
  });

  it('falla si JWT_SECRET tiene menos de 32 caracteres', () => {
    const env = { JWT_SECRET: 'x'.repeat(31), USE_MOCKS: 'true' };
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(/32 caracteres/);
  });

  it('no incluye el valor de JWT_SECRET en el mensaje de error', () => {
    const secret = 'secreto-corto';
    expect(() => loadConfig({ JWT_SECRET: secret, USE_MOCKS: 'true' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(secret) }),
    );
  });

  it('aplica los valores por defecto', () => {
    const config = loadConfig({ JWT_SECRET: VALID_SECRET, ...MS_URLS });
    expect(config).toEqual({
      jwtSecret: VALID_SECRET,
      jwtExpiresIn: '24h',
      useMocks: false,
      msUsuariosUrl: MS_URLS.MS_USUARIOS_URL,
      msSubastasUrl: MS_URLS.MS_SUBASTAS_URL,
      msBilleteraUrl: MS_URLS.MS_BILLETERA_URL,
      msCatalogoUrl: MS_URLS.MS_CATALOGO_URL,
      msPostpujaUrl: MS_URLS.MS_POSTPUJA_URL,
      msNotificacionesUrl: MS_URLS.MS_NOTIFICACIONES_URL,
      rabbitmqUrl: MS_URLS.RABBITMQ_URL,
      port: 4000,
      corsOrigin: 'http://localhost:5173',
    });
  });

  it.each(Object.keys(MS_URLS))('con USE_MOCKS=false exige %s', (name) => {
    const env: Record<string, string> = { JWT_SECRET: VALID_SECRET, ...MS_URLS };
    delete env[name];
    expect(() => loadConfig(env)).toThrow(new RegExp(name));
  });

  it('con USE_MOCKS=true no exige las URL de los MS', () => {
    expect(loadConfig({ JWT_SECRET: VALID_SECRET, USE_MOCKS: 'true' }).useMocks).toBe(true);
  });

  it('rechaza USE_MOCKS y PORT inválidos', () => {
    expect(() => loadConfig({ JWT_SECRET: VALID_SECRET, USE_MOCKS: 'si' })).toThrow(/USE_MOCKS/);
    expect(() => loadConfig({ JWT_SECRET: VALID_SECRET, USE_MOCKS: 'true', PORT: 'abc' })).toThrow(/PORT/);
  });
});
