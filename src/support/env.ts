/**
 * The ONE place that reads `process.env`.
 *
 * Why centralise it: a `process.env.FOO!` scattered through twenty files fails
 * at the moment of use, deep inside a test, as a confusing `undefined` — often
 * as a URL of "undefined/api/login" that 404s and looks like an app bug.
 * Reading everything once, up front, turns that into a clear startup error
 * naming the missing variable.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  baseUrl: optional('BASE_URL', 'https://demo.example.com'),
  apiBaseUrl: optional('API_BASE_URL', 'https://demo.example.com/api'),

  /**
   * Credentials are lazy getters, not eagerly-read fields. A developer running
   * a single spec that needs no login should not be forced to populate them —
   * `required()` should fire when the value is actually wanted, not at import.
   */
  get testUserEmail(): string {
    return required('TEST_USER_EMAIL');
  },
  get testUserPassword(): string {
    return required('TEST_USER_PASSWORD');
  },
} as const;
