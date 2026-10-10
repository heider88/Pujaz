import { describe, expect, it } from 'vitest';
import { MockUserClient } from '../../src/infrastructure/clients/mock/user.mock.js';

const NEW_USER = { name: 'Luis', email: 'luis@correo.com', password: 'secreto456' };

describe('MockUserClient', () => {
  it('crea un usuario sin devolver la contraseña', async () => {
    const user = await new MockUserClient().createUser(NEW_USER);
    expect(user).toEqual({ id: expect.any(String), name: 'Luis', email: 'luis@correo.com', createdAt: expect.any(String) });
    expect(user).not.toHaveProperty('password');
  });

  it.each([
    ['nombre vacío', { ...NEW_USER, name: '  ' }],
    ['correo vacío', { ...NEW_USER, email: '' }],
    ['contraseña vacía', { ...NEW_USER, password: '' }],
    ['correo inválido', { ...NEW_USER, email: 'luis-correo.com' }],
    ['contraseña de 7 caracteres', { ...NEW_USER, password: '1234567' }],
  ])('responde BAD_USER_INPUT con %s', async (_case, input) => {
    await expect(new MockUserClient().createUser(input)).rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it('acepta una contraseña de exactamente 8 caracteres', async () => {
    await expect(new MockUserClient().createUser({ ...NEW_USER, password: '12345678' })).resolves.toBeDefined();
  });

  it('responde EMAIL_TAKEN si el correo ya existe', async () => {
    await expect(new MockUserClient().createUser({ ...NEW_USER, email: 'ana@correo.com' })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
  });

  it('INVALID_CREDENTIALS tiene el mismo mensaje si el correo no existe o la contraseña es incorrecta', async () => {
    const client = new MockUserClient();
    const unknownEmail = client.verifyCredentials({ email: 'nadie@correo.com', password: 'secreto123' });
    const wrongPassword = client.verifyCredentials({ email: 'ana@correo.com', password: 'otra-clave' });
    const [a, b] = await Promise.allSettled([unknownEmail, wrongPassword]);
    expect(a).toMatchObject({ status: 'rejected', reason: { code: 'INVALID_CREDENTIALS' } });
    expect(b).toMatchObject({ status: 'rejected', reason: { code: 'INVALID_CREDENTIALS' } });
    expect((a as PromiseRejectedResult).reason.message).toBe((b as PromiseRejectedResult).reason.message);
  });

  it('getUser responde NOT_FOUND si no existe', async () => {
    await expect(new MockUserClient().getUser('999')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('cada instancia empieza con sus propios datos', async () => {
    await new MockUserClient().createUser(NEW_USER);
    await expect(new MockUserClient().createUser(NEW_USER)).resolves.toBeDefined();
  });
});
