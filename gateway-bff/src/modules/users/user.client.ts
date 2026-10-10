// Contrato con el MS transaccional para usuarios (rest.md §1.1).

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface UserClient {
  /** POST /users · Errores: EMAIL_TAKEN, BAD_USER_INPUT */
  createUser(input: NewUser): Promise<User>;
  /** POST /users/verify-credentials · Errores: INVALID_CREDENTIALS */
  verifyCredentials(input: Credentials): Promise<User>;
  /** GET /users/{userId} · Errores: NOT_FOUND */
  getUser(userId: string): Promise<User>;
}
