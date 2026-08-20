import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/support/env';

/**
 * THE ONE SPEC THAT LOGS IN THROUGH THE UI.
 *
 * Every other spec in this repo takes a token from the API, because logging in
 * is not what they are testing. This file exists so that the shortcut taken
 * everywhere else is still covered: login itself is exercised here, properly,
 * through the form a real user sees.
 *
 * Note `storageState: undefined` — these tests must start SIGNED OUT, but the
 * config signs every test in by default. Without this override the login form
 * would never render and the whole file would fail confusingly on a redirect.
 */
test.use({ storageState: undefined });

test.describe('Login', () => {
  test('a registered user can sign in with valid credentials', async ({
    loginPage,
    dashboardPage,
  }) => {
    // ── ARRANGE ─────────────────────────────────────────────────────────────
    // Get to the starting state. Nothing is asserted here, and nothing that
    // could plausibly break is exercised — the arrange block should never be
    // the thing that fails.
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // ── ACT ─────────────────────────────────────────────────────────────────
    // Exactly ONE action: the behaviour under test. If this block has three
    // steps in it, the test probably has three names' worth of scope and should
    // be split.
    await loginPage.signIn(env.testUserEmail, env.testUserPassword);

    // ── ASSERT ──────────────────────────────────────────────────────────────
    // Assert on the OUTCOME the user perceives, not on internals. "The
    // dashboard is showing" is the promise login makes; "a token exists in
    // localStorage" is how it happens to be kept, and asserting that would tie
    // the test to an implementation detail.
    //
    // Both assertions are web-first (`expect(locator)`) and therefore
    // auto-retrying. No sleep, no waitFor.
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.nav.userMenuButton).toBeVisible();
  });

  test('an invalid password is rejected with a visible error', async ({ loginPage }) => {
    // ── ARRANGE ──
    await loginPage.goto();

    // ── ACT ──
    await loginPage.signIn(env.testUserEmail, 'definitely-the-wrong-password');

    // ── ASSERT ──
    await expect(loginPage.errorBanner).toHaveText(/invalid email or password/i);

    // Assert the NEGATIVE too. A test that only checks the error appeared would
    // still pass if the app showed an error AND signed the user in anyway —
    // which is a real bug class, not a hypothetical one.
    await expect(loginPage.heading).toBeVisible();
  });

  test('submitting an empty form shows field validation', async ({ loginPage }) => {
    // ── ARRANGE ──
    await loginPage.goto();

    // ── ACT ──
    await loginPage.submitEmpty();

    // ── ASSERT ──
    await expect(loginPage.errorBanner).toBeVisible();
  });
});
