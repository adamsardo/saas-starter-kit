import { hash, compare } from 'bcryptjs';

import env from './env';
import type { AUTH_PROVIDER } from 'types';

export async function hashPassword(password: string) {
  return await hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await compare(password, hashedPassword);
}

export const authProviders: AUTH_PROVIDER[] = ['github', 'google'];

// Password policies  
export const passwordPolicies = {
  minLength: 7,
}
