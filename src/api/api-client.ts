import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../support/env';

/**
 * Thin transport wrapper around Playwright's APIRequestContext.
 *
 * WHY USE PLAYWRIGHT'S CLIENT RATHER THAN fetch/axios:
 *   - it shares the proxy, TLS and tracing configuration of the browser, so an
 *     API call made here appears in the SAME trace as the UI steps around it.
 *     When a test fails, you can see the setup call that preceded it.
 *   - it is disposed automatically with the fixture, so no socket leaks.
 *
 * WHY A WRAPPER AT ALL, rather than calling `request.post()` in resource
 * classes: it puts error handling in exactly one place. A raw Playwright API
 * call does NOT throw on 4xx/5xx — it returns a response object with `ok()`
 * false. Forgetting to check that is the single most common way an API-assisted
 * test "passes setup" and then fails mysteriously in the UI, because the record
 * it was supposed to create never existed.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  /** Returns a copy of this client that authenticates as the given token.
   *  Immutable rather than a setter, so one test acting as two different users
   *  cannot accidentally mutate the other's client. */
  withToken(token: string): ApiClient {
    return new ApiClient(this.request, token);
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private url(path: string): string {
    return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /**
   * Turns a non-2xx into a loud, readable failure.
   *
   * The message deliberately includes the response body. An API test failure
   * that says only "expected 200, got 422" costs a debugging round-trip; one
   * that includes `{"errors":{"name":"already taken"}}` is self-diagnosing.
   */
  private async unwrap<T>(response: APIResponse, method: string, path: string): Promise<T> {
    if (!response.ok()) {
      const body = await response.text().catch(() => '<unreadable body>');
      throw new Error(
        `API ${method} ${path} failed: ${response.status()} ${response.statusText()}\n${body}`,
      );
    }
    // 204 No Content has no body; JSON-parsing it throws.
    if (response.status() === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.request.get(this.url(path), { headers: this.headers() });
    return this.unwrap<T>(res, 'GET', path);
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    const res = await this.request.post(this.url(path), { headers: this.headers(), data });
    return this.unwrap<T>(res, 'POST', path);
  }

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const res = await this.request.patch(this.url(path), { headers: this.headers(), data });
    return this.unwrap<T>(res, 'PATCH', path);
  }

  async delete<T>(path: string): Promise<T> {
    const res = await this.request.delete(this.url(path), { headers: this.headers() });
    return this.unwrap<T>(res, 'DELETE', path);
  }

  /**
   * Escape hatch for the one legitimate case: a test that is ASSERTING on a
   * failure status (403 for an unauthorised user, 422 for bad input). Those
   * tests want the raw response, not an exception.
   */
  async raw(method: 'get' | 'post', path: string, data?: unknown): Promise<APIResponse> {
    return method === 'get'
      ? this.request.get(this.url(path), { headers: this.headers() })
      : this.request.post(this.url(path), { headers: this.headers(), data });
  }
}
