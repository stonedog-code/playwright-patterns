import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';

import { LoginPage } from '../../src/pages/login.page';
import { DashboardPage } from '../../src/pages/dashboard.page';
import { CreateProjectPage } from '../../src/pages/create-project.page';
import { ProjectDetailPage } from '../../src/pages/project-detail.page';

import { ApiClient } from '../../src/api/api-client';
import { AuthApi } from '../../src/api/auth.api';
import { ProjectsApi } from '../../src/api/projects.api';
import type { Project } from '../../src/api/types';
import type { NewProject } from '../../src/support/data-factory';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CUCUMBER "DI CONTAINER" — THE WORLD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cucumber's World is the closest thing it has to Playwright's fixtures: one
 * instance per scenario, and `this` inside every step definition.
 *
 * THE PAGE OBJECTS AND API HELPERS ARE THE EXACT SAME CLASSES the Playwright
 * specs use — imported from `src/`, unchanged. That is the headline result of
 * this whole comparison: **the POM and API layers are framework-independent.**
 * Only the test-authoring layer differs. If you build the structure in `src/`
 * properly, you can switch runners without rewriting it.
 *
 * WHERE THE WORLD IS WORSE THAN FIXTURES — four concrete losses:
 *
 *  1. NOT LAZY. Every field is built for every scenario, whether used or not.
 *     Playwright builds only what a test names in its signature.
 *
 *  2. NOT TYPE-SAFE AT THE CALL SITE. A Playwright test that asks for
 *     `{ projectsApi }` gets a compile error if it does not exist. A step
 *     definition reaching for `this.projectsApi` type-checks against this
 *     interface, but nothing verifies the step ACTUALLY has it initialised —
 *     the `!` assertions below are a promise to the compiler that hooks ran.
 *     Get the hook ordering wrong and you get a runtime `undefined`.
 *
 *  3. NO SCOPES. Playwright distinguishes worker-scoped (build once per
 *     process, e.g. an auth token) from test-scoped. Cucumber has per-scenario
 *     and module-global, and nothing in between — so the shared-token
 *     optimisation has to be hand-rolled with a module-level variable and a
 *     BeforeAll hook (see hooks.ts).
 *
 *  4. NO AUTOMATIC TEARDOWN PAIRING. A fixture's teardown sits three lines
 *     below its setup, in the same function. Here, setup is in `Before` and
 *     teardown in `After`, in a different file, and keeping them in sync is
 *     manual.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface TestWorldState {
  /** Data carried BETWEEN steps. This is the other significant cost: in a
   *  Playwright test, a value created in ARRANGE is just a `const` in scope. In
   *  Cucumber, steps are separate functions, so anything shared must be stashed
   *  on `this` — an untyped-by-default bag that grows over time and is the most
   *  common source of "works alone, fails in a suite" bugs. */
  currentProject?: Project;
  pendingProject?: NewProject;
  currentToken?: string;
}

export class TestWorld extends World {
  // Browser plumbing, assigned in hooks.
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  apiContext!: APIRequestContext;

  // Page objects — the same classes the Playwright specs use.
  loginPage!: LoginPage;
  dashboardPage!: DashboardPage;
  createProjectPage!: CreateProjectPage;
  projectDetailPage!: ProjectDetailPage;

  // API helpers — likewise identical.
  api!: ApiClient;
  authedApi!: ApiClient;
  authApi!: AuthApi;
  projectsApi!: ProjectsApi;

  /** Ids of records created during the scenario, for teardown. In Playwright
   *  this bookkeeping is hidden inside the `projectsApi` fixture and no test
   *  author ever sees it; here it is the step author's responsibility to
   *  remember to push, which is a rule that will eventually be forgotten. */
  readonly createdProjectIds: string[] = [];

  state: TestWorldState = {};

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Called from the Before hook once `page` and `apiContext` exist. Keeping
   *  construction in one method is the nearest equivalent to having all the
   *  fixture definitions in one file. */
  initialise(): void {
    this.loginPage = new LoginPage(this.page);
    this.dashboardPage = new DashboardPage(this.page);
    this.createProjectPage = new CreateProjectPage(this.page);
    this.projectDetailPage = new ProjectDetailPage(this.page);

    this.api = new ApiClient(this.apiContext);
    this.authApi = new AuthApi(this.api);
  }

  /** Re-wire the API helpers once a token is known. Playwright expresses this
   *  as a fixture depending on another fixture and the framework orders it;
   *  here it is a method someone must remember to call. */
  authenticateApi(token: string): void {
    this.state.currentToken = token;
    this.authedApi = new ApiClient(this.apiContext, token);
    this.projectsApi = new ProjectsApi(this.authedApi);
  }
}

setWorldConstructor(TestWorld);
