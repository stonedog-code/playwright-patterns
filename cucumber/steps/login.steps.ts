import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import type { TestWorld } from '../support/world';
import { env } from '../../src/support/env';

/**
 * Step definitions for login.feature.
 *
 * NOTE WHAT THESE FUNCTIONS DO AND DO NOT DO. Each is two or three lines: it
 * translates one English sentence into one page-object call or one assertion.
 * That is the correct amount. A step definition containing real logic — loops,
 * conditionals, locator construction — is the main way Cucumber suites rot,
 * because that logic is then invisible from the feature file that is supposed
 * to be the readable artefact.
 *
 * THE COST MADE CONCRETE: the Playwright version of these three scenarios is
 * ~40 lines in ONE file. Here it is a .feature file plus this file plus the
 * World plus the hooks — four files, ~250 lines, to express the same coverage.
 * Every scenario change means editing at least two of them, and a renamed step
 * fails at RUNTIME as "undefined step", never at compile time.
 */

Given('I am signed out', async function (this: TestWorld) {
  // Explicit, because the hooks sign every scenario in by default.
  await this.context.clearCookies();
  await this.page.addInitScript(() => window.localStorage.clear());
});

Given('I am on the login page', async function (this: TestWorld) {
  await this.loginPage.goto();
  await expect(this.loginPage.heading).toBeVisible();
});

When('I sign in with valid credentials', async function (this: TestWorld) {
  await this.loginPage.signIn(env.testUserEmail, env.testUserPassword);
});

// A parameterised step. `{string}` captures the quoted text from the feature
// file. This is Gherkin's answer to a test helper taking an argument — neat,
// but note the type is whatever the expression says, and a mismatch between the
// feature file's wording and this pattern is a runtime failure.
When('I sign in with the password {string}', async function (this: TestWorld, password: string) {
  await this.loginPage.signIn(env.testUserEmail, password);
});

When('I submit the login form without filling it in', async function (this: TestWorld) {
  await this.loginPage.submitEmpty();
});

Then('I should see the projects dashboard', async function (this: TestWorld) {
  await expect(this.dashboardPage.heading).toBeVisible();
});

Then('I should see my account menu', async function (this: TestWorld) {
  await expect(this.dashboardPage.nav.userMenuButton).toBeVisible();
});

Then('I should see the error {string}', async function (this: TestWorld, message: string) {
  await expect(this.loginPage.errorBanner).toHaveText(new RegExp(message, 'i'));
});

Then('I should still be on the login page', async function (this: TestWorld) {
  await expect(this.loginPage.heading).toBeVisible();
});

Then('I should see a validation error', async function (this: TestWorld) {
  await expect(this.loginPage.errorBanner).toBeVisible();
});
