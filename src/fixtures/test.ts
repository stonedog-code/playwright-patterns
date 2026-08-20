import { test as base, expect, request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { CreateProjectPage } from '../pages/create-project.page';
import { ProjectDetailPage } from '../pages/project-detail.page';

import { ApiClient } from '../api/api-client';
import { AuthApi } from '../api/auth.api';
import { ProjectsApi } from '../api/projects.api';
import { env } from '../support/env';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE DEPENDENCY-INJECTION CONTAINER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Playwright's fixture system IS a DI container, and reaching for a third-party
 * one (tsyringe, inversify) is a mistake in this ecosystem — you lose the two
 * things that make fixtures worth using.
 *
 * A test declares what it needs by NAMING it in the destructured argument:
 *
 *     test('...', async ({ loginPage, projectsApi }) => { ... })
 *
 * and Playwright constructs exactly those, in dependency order, per test.
 *
 * WHAT THIS BUYS OVER `new LoginPage(page)` IN EVERY TEST:
 *
 *   1. LAZY — a fixture is built only if the test names it. A spec that never
 *      touches the API never opens an API context. With manual construction,
 *      every `beforeEach` pays for everything.
 *
 *   2. AUTOMATIC TEARDOWN — everything after the `await use(...)` line runs when
 *      the test finishes, PASS OR FAIL. This is the part hand-rolled setup
 *      always gets wrong: an `afterEach` that is skipped because the test threw
 *      leaves records behind, and leaked data is what makes a suite that passed
 *      yesterday fail today.
 *
 *   3. COMPOSABLE — fixtures can depend on fixtures (see `projectsApi`, which
 *      depends on `authedApi`, which depends on `api`). Playwright resolves the
 *      graph. Nothing in a test has to know the wiring order.
 *
 *   4. ONE PLACE TO CHANGE — when `LoginPage` gains a constructor argument, one
 *      line here changes rather than every `beforeEach` in the repo.
 *
 *   5. REPORTED — each fixture appears as a step in the HTML report and trace,
 *      so a failure during setup is attributed to setup rather than showing up
 *      as an inscrutable error inside the test body.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Fixtures rebuilt for EVERY test. Anything holding per-test state lives here. */
interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  createProjectPage: CreateProjectPage;
  projectDetailPage: ProjectDetailPage;
}

interface ApiFixtures {
  /** Unauthenticated client — for login calls and public endpoints. */
  api: ApiClient;
  /** Same client carrying a bearer token for the shared QA user. */
  authedApi: ApiClient;
  authApi: AuthApi;
  projectsApi: ProjectsApi;
}

/** Fixtures built ONCE PER WORKER PROCESS and shared by every test that worker
 *  runs. Use sparingly: worker-scoped state is shared state, and shared state
 *  is what test isolation exists to prevent. Correct here because a token is
 *  read-only and minting one per test is pure waste. */
interface WorkerFixtures {
  workerApiContext: APIRequestContext;
  sharedAuthToken: string;
}

export const test = base.extend<PageFixtures & ApiFixtures, WorkerFixtures>({
  // ───────────────────────── worker-scoped ─────────────────────────

  /**
   * One APIRequestContext per worker.
   *
   * Deliberately NOT the built-in `request` fixture: that one is test-scoped
   * and would be torn down between tests, so it cannot back a worker-scoped
   * token. Creating our own also keeps API setup calls independent of the
   * browser context's cookies — an important property, because a test that
   * signs out in the UI must not thereby break its own API teardown.
   */
  workerApiContext: [
    async ({}, use) => {
      const context = await request.newContext({ baseURL: env.apiBaseUrl });
      await use(context);
      // Teardown: runs after the worker's last test, even if tests failed.
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  /**
   * One login per worker instead of one per test.
   *
   * On a 50-test suite across 4 workers this is 4 logins rather than 50 — the
   * difference between a suite you run on every commit and one you run
   * overnight.
   */
  sharedAuthToken: [
    async ({ workerApiContext }, use) => {
      const authApi = new AuthApi(new ApiClient(workerApiContext));
      const { token } = await authApi.loginAsTestUser();
      await use(token);
    },
    { scope: 'worker' },
  ],

  // ─────────────────────────── API, test-scoped ───────────────────────────

  api: async ({ workerApiContext }, use) => {
    await use(new ApiClient(workerApiContext));
  },

  authedApi: async ({ workerApiContext, sharedAuthToken }, use) => {
    await use(new ApiClient(workerApiContext, sharedAuthToken));
  },

  authApi: async ({ api }, use) => {
    await use(new AuthApi(api));
  },

  /**
   * Projects helper, WITH AUTOMATIC CLEANUP.
   *
   * This is the pattern worth copying above all others here. The fixture wraps
   * `create` so that every project a test makes is recorded, and deletes them
   * all in teardown — which runs on failure too.
   *
   * The alternative (an `afterEach` in each spec) fails in exactly the case you
   * need it: when the test throws partway through, leaving the record behind.
   * Do this once, centrally, and no spec author has to remember it.
   */
  projectsApi: async ({ authedApi }, use) => {
    const helper = new ProjectsApi(authedApi);
    const created: string[] = [];

    // Wrap `create` to record what it made. Everything else passes through.
    const tracked = new Proxy(helper, {
      get(target, prop, receiver) {
        if (prop === 'create') {
          return async (...args: Parameters<ProjectsApi['create']>) => {
            const project = await target.create(...args);
            created.push(project.id);
            return project;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    await use(tracked);

    // ── teardown ──
    // Concurrent, and each failure swallowed by `deleteIfExists`. Teardown must
    // never turn a passing test red or mask the real failure of a failing one.
    await Promise.all(created.map((id) => helper.deleteIfExists(id)));
  },

  // ────────────────────────── page objects ──────────────────────────
  //
  // Each is one line. That uniformity is the point: adding a page to the suite
  // means adding a field to `PageFixtures` and a line here, and every test in
  // the repo can immediately ask for it by name.

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  createProjectPage: async ({ page }, use) => {
    await use(new CreateProjectPage(page));
  },

  projectDetailPage: async ({ page }, use) => {
    await use(new ProjectDetailPage(page));
  },
});

/** Re-exported so specs import BOTH `test` and `expect` from here, never from
 *  '@playwright/test' directly. That single import line is what guarantees a
 *  spec cannot bypass the fixtures — and it makes the mistake visible in review
 *  as a wrong import path rather than as subtly-wrong behaviour. */
export { expect };
