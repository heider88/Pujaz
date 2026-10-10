import type { User, UserClient } from './user.client.js';

export class UsersService {
  constructor(private readonly userClient: UserClient) {}

  getMe(userId: string): Promise<User> {
    return this.userClient.getUser(userId);
  }
}
