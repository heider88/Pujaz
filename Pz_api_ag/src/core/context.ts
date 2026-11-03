import { AppError } from './errors.js';

export interface UserContext {
  id: string;
  role: string;
}

export interface GatewayContext {
  user: UserContext | null;
}

// Primera línea de todo resolver protegido.
export function requireUser(ctx: GatewayContext): UserContext {
  if (ctx.user === null) {
    throw new AppError('UNAUTHENTICATED', 'Debes iniciar sesión.');
  }
  return ctx.user;
}
