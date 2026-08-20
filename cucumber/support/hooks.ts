import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  Status,
  setDefaultTimeout,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { chromium, request, type Browser, type APIRequestContext } from '@playwright/test';

import { TestWorld } from './world';
import { ApiClient } from '../../src/api/api-client';
import { AuthApi } from '../../src/api/auth.api';
import { ProjectsApi } from '../../src/api/projects.api';
import { env } from '../../src/support/env';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOKS — everything Playwright gives you for free, rebuilt by hand.
 *
 * This file has no counterpart in the Playwright suite. Its entire contents are
 * the cost of leaving the framework's own runner: browser lifecycle, timeouts,
 * per-worker token caching, screenshot-on-failure, and cleanup.
 *
 * That is the honest bottom line of the comparison — not that Cucumber is bad,
 * but that ~120 lines of infrastructure exist here purely to reach parity, and
 * they are yours to maintain and debug forever.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Playwright reads timeouts from config with sensible defaults; Cucumber's
// default is 5s and will fail any real browser scenario, so it must be set.
setDefaultTimeout(60_000);

// Module-level, i.e. once per WORKER PROCESS. This is the hand-rolled
// equivalent of Playwright's `{ scope: 'worker' }` fixtures.
let browser: Browser;
let workerApiContext: APIRequestContext;
let sharedToken: string;

BeforeAll(async function () {
  browser = await chromium.launch();
  workerApiContext = await request.newContext({ baseURL: env.apiBaseUrl });

  // The same "log in once per worker over the API" optimisation the Playwright
  // suite gets from a worker-scoped fixture. Same benefit, more code, and the
  // caching is now something a reader has to notice rather than something the
  // framework guarantees.
  const authApi = new AuthApi(new ApiClient(workerApiContext));
  const { token } = await authApi.loginAsTestUser();
  sharedToken = token;
});

AfterAll(async function () {
  await workerApiContext?.dispose();
  await browser?.close();
});

Before(async function (this: TestWorld) {
  // A fresh context per scenario — the isolation Playwright gives by default.
  this.browser = browser;
  this.context = await browser.newContext({ baseURL: env.baseUrl });
  this.page = await this.context.newPage();
  this.apiContext = workerApiContext;
  this.initialise();
});

/**
 * TAGGED HOOK — the "sign in" Background step, done properly.
 *
 * Tagging is genuinely one of Cucumber's better features: this runs only for
 * scenarios marked @authenticated, giving back some of the laziness the World
 * loses. It has to be wired by hand, and a scenario that forgets the tag fails
 * in a confusing way rather than at compile time.
 */
Before({ tags: '@authenticated or not @anonymous' }, async function (this: TestWorld) {
  this.authenticateApi(sharedToken);
  await this.page.addInitScript((t: string) => {
    window.localStorage.setItem('auth.token', t);
  }, sharedToken);
});

After(async function (this: TestWorld, scenario: ITestCaseHookParameter) {
  // ── Diagnostics on failure ──
  // Playwright does this from config (`screenshot: 'only-on-failure'`, plus
  // traces and video). Here it is hand-written, and traces/video are simply
  // absent unless someone writes more of this.
  if (scenario.result?.status === Status.FAILED && this.page) {
    const png = await this.page.screenshot({ fullPage: true });
    this.attach(png, 'image/png');
  }

  // ── Cleanup ──
  // The equivalent of the `projectsApi` fixture's teardown. Note it depends on
  // step authors having remembered to push ids onto `createdProjectIds` — the
  // Playwright version cannot be forgotten because the fixture wraps `create`.
  if (this.projectsApi) {
    const cleanup = new ProjectsApi(this.authedApi);
    await Promise.all(this.createdProjectIds.map((id) => cleanup.deleteIfExists(id)));
  }

  await this.context?.close();
});
