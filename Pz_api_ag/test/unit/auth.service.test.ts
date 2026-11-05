import { describe, expect, it } from 'vitest';
import { requireUser } from '../../src/core/context.js';
import { MockUserClient } from '../../src/infrastructure/clients/mock/user.mock.js';
import { AuthService, TokenService } from '../../src/modules/auth/index.js';

const tokens = new TokenService('x'.repeat(32), '24h');

describe('AuthService', () => {
  it('register crea el usuario y firma un token con su id y su rol', async () => {
    const auth = new AuthService(new MockUserClient(), tokens);
    const { token, user } = await auth.register({
      name: 'Luis',
      email: 'luis@correo.com',
      password: 'Secreto456',
      role: 'vendedor',
    });
    await expect(tokens.verify(token)).resolves.toEqual({ userId: user.id, role: 'vendedor' });
  });

  it('login firma un token con el id y el rol del usuario', async () => {
    const auth = new AuthService(new MockUserClient(), tokens);
    const { token, user } = await auth.login({ email: 'ana@correo.com', password: 'secreto123' });
    expect(user.id).toBe('7');
    await expect(tokens.verify(token)).resolves.toEqual({ userId: '7', role: 'comprador' });
  });

  it('login reenvía el error del cliente sin firmar nada', async () => {
    const auth = new AuthService(new MockUserClient(), tokens);
    await expect(auth.login({ email: 'ana@correo.com', password: 'mala-clave' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('resolveUser devuelve el id y el rol de un token válido de un usuario que existe', async () => {
    const auth = new AuthService(new MockUserClient(), tokens);
    await expect(auth.resolveUser(await tokens.sign('7', 'comprador'))).resolves.toEqual({ id: '7', role: 'comprador' });
  });

  it('resolveUser devuelve null con un token inválido', async () => {
    const auth = new AuthService(new MockUserClient(), tokens);
    await expect(auth.resolveUser('no-es-un-jwt')).resolves.toBeNull();
  });

  it('resolveUser devuelve null si el usuario fue borrado', async () => {
    const users = new MockUserClient();
    const auth = new AuthService(users, tokens);
    const token = await tokens.sign('7', 'comprador');
    await users.deleteUser('7');
    await expect(auth.resolveUser(token)).resolves.toBeNull();
  });
});

describe('requireUser', () => {
  it('devuelve el usuario si hay sesión', () => {
    expect(requireUser({ user: { id: '7', role: 'comprador' } })).toEqual({ id: '7', role: 'comprador' });
  });

  it('lanza UNAUTHENTICATED si no hay usuario', () => {
    expect(() => requireUser({ user: null })).toThrow(expect.objectContaining({ code: 'UNAUTHENTICATED' }));
  });
});
