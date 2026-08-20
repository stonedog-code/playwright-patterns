import { test as setup } from '../../src/fixtures/test';

const STORAGE_STATE = 'playwright/.auth/user.json';

/**
 * AUTHENTICATION SETUP — runs once, before the whole suite.
 *
 * Declared as a `setup` project in playwright.config.ts, which every browser
 * project depends on. The state it writes is loaded into every test's context
 * via `use.storageState`, so tests start already signed in.
 *
 * WHY THIS IS THE BIGGEST WIN AVAILABLE:
 *   50 tests x ~4s of UI login = ~3.5 minutes of every run spent re-proving
 *   that login works. Here it costs one API call, once.
 *
 * AND IT REMOVES A WHOLE CLASS OF FLAKE. Every UI login is an opportunity to
 * fail on something unrelated to the test — a slow redirect, a cookie banner, a
 * rate limiter that trips when 4 workers log in simultaneously. Tests that
 * never touch the login form cannot fail on it.
 *
 * The trade-off, stated plainly: the suite no longer proves login works on
 * every run. That is what `tests/auth/login.spec.ts` is for, and why it is the
 * one spec that deliberately drives the UI form.
 */
setup('authenticate via API and persist storage state', async ({ page, authApi }) => {
  // ── ARRANGE ── obtain credentials without touching the browser at all
  const { token } = await authApi.loginAsTestUser();

  // ── ACT ── put the token where the application expects to find it.
  //
  // This is the one place a test may legitimately reach past the UI into
  // application internals, and it is the reason this file needs a comment
  // explaining itself: it COUPLES THE SUITE TO HOW THE APP STORES ITS SESSION.
  // If the app moves from localStorage to an httpOnly cookie, this breaks — and
  // it should, loudly, in one file, rather than silently signing tests out.
  //
  // `addInitScript` runs before any page script on every navigation, so the
  // token is present before the app's bootstrap code looks for it. Setting
  // localStorage after `goto` would race the app's own auth check.
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('auth.token', value);
  }, token);

  // Navigate once so there is an origin for the storage state to attach to;
  // a storage state saved with no origin visited contains nothing.
  await page.goto('/dashboard');

  // ── ASSERT ── prove the session actually took before persisting it.
  //
  // Without this check, a broken token produces a storage-state file that looks
  // fine and then fails EVERY test in the suite with a redirect to /login —
  // dozens of failures pointing everywhere except at the real cause. Failing
  // here instead gives one failure, in the right place.
  await page.waitForURL('**/dashboard');

  await page.context().storageState({ path: STORAGE_STATE });
});
