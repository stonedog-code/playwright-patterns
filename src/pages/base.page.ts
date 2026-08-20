import type { Page, Response } from '@playwright/test';

/**
 * Shared behaviour for every page object.
 *
 * Keep this class SMALL. A fat base class becomes a dumping ground, and every
 * page object then inherits fifty methods of which it uses two — which is how
 * you end up unable to tell what a page actually does.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Path this page lives at, relative to baseURL. Subclasses supply it so
   *  `goto()` can be defined once here rather than in every page. */
  protected abstract readonly path: string;

  /**
   * Navigate directly to this page.
   *
   * DEEP-LINKING IS A FEATURE, NOT A SHORTCUT. Clicking through three screens
   * to reach the page under test means three screens' worth of unrelated flake
   * attached to every test. Go straight there, and let a dedicated navigation
   * test cover the clicking.
   */
  async goto(): Promise<Response | null> {
    return this.page.goto(this.path);
  }

  /**
   * NOTE ON WAITING — the most important convention in this repo.
   *
   * There is deliberately no `waitForLoad()`, no `sleep()`, and no
   * `waitForTimeout()` anywhere in this codebase. Playwright's locators and
   * `expect` assertions auto-wait: they poll until the element is actionable or
   * the timeout expires. A hard sleep is either too short (flake) or too long
   * (a slow suite), and it is never right.
   *
   * `waitForLoadState('networkidle')` is also avoided: on any app with polling,
   * websockets or analytics beacons, "network idle" never arrives, and the test
   * times out for a reason that has nothing to do with the feature.
   *
   * If you genuinely need to wait for something, wait for the SPECIFIC thing —
   * `await expect(page.heading).toBeVisible()` — not for time to pass.
   */
}
