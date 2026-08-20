import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * The login screen.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE DESIGN TENSION IN THIS REPO, RESOLVED EXPLICITLY
 * ─────────────────────────────────────────────────────────────────────────────
 * Classic POM advice says "never leak a Locator out of a page object". Taken
 * literally in Playwright, that advice makes your suite FLAKIER, and here is
 * why.
 *
 * If a page object returns a string:
 *
 *     expect(await loginPage.getErrorText()).toBe('Invalid credentials');
 *
 * ...the read happens ONCE, at the instant `getErrorText()` runs. If the error
 * banner has not rendered yet, you get '' and the test fails. That is a race,
 * and it is the single most common source of flake in POM-based suites.
 *
 * If it returns a Locator:
 *
 *     await expect(loginPage.errorBanner).toHaveText('Invalid credentials');
 *
 * ...Playwright's web-first assertion POLLS until it matches or times out. No
 * race, no sleep, and a far better failure message.
 *
 * So this repo's rule is a refinement of the classic one:
 *
 *   • Tests NEVER construct locators.       (`page.locator(...)` in a spec = review reject)
 *   • Page objects MAY expose named locators, purely as an ASSERTION SURFACE.
 *   • Everything a test DOES goes through a behaviour method.
 *
 * The encapsulation that actually matters is preserved: the selector strings
 * live here and nowhere else. Renaming a CSS class still touches exactly one
 * file. What is exposed is a stable, intention-revealing NAME — `errorBanner` —
 * not the selector behind it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class LoginPage extends BasePage {
  protected readonly path = '/login';

  constructor(page: Page) {
    super(page);
  }

  // ── Private locators: the internals. Nothing outside this class sees these ──
  //
  // Locators are LAZY. Declaring them as getters (or fields) does not query the
  // DOM — resolution happens at use. That is why a page object can be
  // constructed before the page has even navigated.
  //
  // Locator priority, best to worst:
  //   1. getByRole      — mirrors the accessibility tree; breaks only when the
  //                       user-visible semantics genuinely change
  //   2. getByLabel / getByPlaceholder  — for form fields
  //   3. getByTestId    — when semantics are genuinely absent
  //   4. CSS / XPath    — last resort; couples the test to styling
  private get emailInput(): Locator {
    return this.page.getByLabel('Email address');
  }
  private get passwordInput(): Locator {
    return this.page.getByLabel('Password');
  }
  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign in' });
  }

  // ── Assertion surface: intentionally public, read-only, never clicked ──
  get errorBanner(): Locator {
    return this.page.getByRole('alert');
  }
  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Sign in to your account' });
  }

  // ── Behaviour: what a USER can do here, named in the user's language ──

  /**
   * Fill the form and submit it.
   *
   * Named for intent (`signIn`) rather than mechanics (`fillFormAndClick`). The
   * test reads as a description of user behaviour, and the mechanics stay free
   * to change — if login gains a "continue" step, only this method changes.
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Submit with the form left empty — used by validation tests.
   *
   * A separate named method rather than `signIn('', '')`, because the intent is
   * different and a reader should not have to infer it from two empty strings.
   */
  async submitEmpty(): Promise<void> {
    await this.submitButton.click();
  }
}
