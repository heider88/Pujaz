import { requireUser, type GatewayContext } from '../../core/context.js';
import type { UsersService } from './users.service.js';

export function createUsersResolvers(usersService: UsersService) {
  return {
    Query: {
      me: (_parent: unknown, _args: unknown, ctx: GatewayContext) => usersService.getMe(requireUser(ctx)),
    },
  };
}
