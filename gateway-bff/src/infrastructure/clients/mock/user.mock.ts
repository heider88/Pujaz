import { AppError } from '../../../core/errors.js';
import type { Credentials, NewUser, User, UserClient } from '../../../modules/users/index.js';

interface StoredUser extends User {
  // Texto plano: aceptable solo en el cliente falso.
  password: string;
}

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos.';

// Usuario de ejemplo de rest.md §1.
const SEED_USERS: StoredUser[] = [
  {
    id: '7',
    name: 'Ana',
    email: 'ana@correo.com',
    password: 'secreto123',
    createdAt: '2026-10-09T14:00:00Z',
  },
];

export class MockUserClient implements UserClient {
  private readonly users: StoredUser[] = SEED_USERS.map((user) => ({ ...user }));
  private nextId = 100;

  async createUser(input: NewUser): Promise<User> {
    if (!input.name.trim() || !input.email.trim() || !input.password) {
      throw new AppError('BAD_USER_INPUT', 'Nombre, correo y contraseña son obligatorios.');
    }
    if (!EMAIL_PATTERN.test(input.email)) {
      throw new AppError('BAD_USER_INPUT', 'El correo no es válido.');
    }
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError('BAD_USER_INPUT', `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    if (this.findByEmail(input.email)) {
      throw new AppError('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.');
    }
    const user: StoredUser = {
      id: String(this.nextId++),
      name: input.name,
      email: input.email,
      password: input.password,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return toPublic(user);
  }

  async verifyCredentials({ email, password }: Credentials): Promise<User> {
    const user = this.findByEmail(email);
    if (!user || user.password !== password) {
      throw new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
    }
    return toPublic(user);
  }

  async getUser(userId: string): Promise<User> {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'El usuario no existe.');
    }
    return toPublic(user);
  }

  private findByEmail(email: string): StoredUser | undefined {
    return this.users.find((user) => user.email === email);
  }
}

function toPublic({ id, name, email, createdAt }: StoredUser): User {
  return { id, name, email, createdAt };
}
