import { ApiClient } from './api-client';
import type { AuthToken, User } from './types';
import { env } from '../support/env';

/**
 * Authentication helpers.
 *
 * THIS IS THE HIGHEST-VALUE API HELPER IN ANY SUITE. Logging in through the UI
 * costs a page load, a form fill, a navigation and a redirect — call it 3-6
 * seconds. Multiply by every test and it dominates the runtime, and every one
 * of those seconds is a chance to flake on something that is not what the test
 * is about.
 *
 * The rule that follows: EXACTLY ONE test logs in through the UI — the one
 * whose subject IS the login form. Everything else takes a token from here.
 */
export class AuthApi {
  constructor(private readonly api: ApiClient) {}

  /** Mint a token for the shared, pre-seeded QA account. */
  async loginAsTestUser(): Promise<AuthToken> {
    return this.login(env.testUserEmail, env.testUserPassword);
  }

  async login(email: string, password: string): Promise<AuthToken> {
    return this.api.post<AuthToken>('/auth/login', { email, password });
  }

  /**
   * Create a throwaway user and return a token for it.
   *
   * Prefer this over the shared account whenever a test MUTATES user-level
   * state (preferences, onboarding flags, notification settings). Two parallel
   * tests toggling the same shared user's settings is a flake you will spend a
   * day chasing, and it will look like a timing bug rather than a data bug.
   */
  async createUserAndLogin(
    user: { email: string; fullName: string; role: string },
    password = 'Passw0rd!-e2e',
  ): Promise<{ user: User; token: string }> {
    const created = await this.api.post<User>('/users', { ...user, password });
    const auth = await this.login(created.email, password);
    return { user: created, token: auth.token };
  }

  async currentUser(): Promise<User> {
    return this.api.get<User>('/auth/me');
  }
}
