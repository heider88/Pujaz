import { AppError } from '../../core/errors.js';
import type { Credentials, NewUser, User, UserClient } from '../users/index.js';
import type { TokenService } from './token.service.js';

export interface AuthPayload {
  token: string;
  user: User;
}

export class AuthService {
  constructor(
    private readonly userClient: UserClient,
    private readonly tokenService: TokenService,
  ) {}

  async register(input: NewUser): Promise<AuthPayload> {
    const user = await this.userClient.createUser(input);
    return { token: await this.tokenService.sign(user.id, user.role), user };
  }

  async login(credentials: Credentials): Promise<AuthPayload> {
    const user = await this.userClient.verifyCredentials(credentials);
    return { token: await this.tokenService.sign(user.id, user.role), user };
  }

  // Datos del token, o null si el token no es válido o el usuario ya no existe (fue eliminado)
  async resolveUser(token: string): Promise<{ id: string; role: string } | null> {
    let payload: { userId: string; role: string };
    try {
      payload = await this.tokenService.verify(token);
    } catch {
      return null;
    }
    try {
      await this.userClient.getUser(payload.userId);
    } catch (error) {
      if (error instanceof AppError && error.code === 'NOT_FOUND') return null;
    }
    return { id: payload.userId, role: payload.role };
  }
}
