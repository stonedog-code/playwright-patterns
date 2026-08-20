import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import type { TestWorld } from '../support/world';
import { aProject, aUser } from '../../src/support/data-factory';

/**
 * Step definitions for project-crud.feature.
 *
 * The API-assisted setup pattern survives the port intact — look at the first
 * Given below. What is lost is VISIBILITY: in the Playwright spec, the line
 * `const project = await projectsApi.create(aProject())` sits directly above
 * the assertions that use it, and a reader sees the whole arrangement at once.
 * Here the creation is in this file and the scenario is in another, joined by a
 * sentence.
 */

Given('I am signed in', async function (this: TestWorld) {
  // The heavy lifting already happened in the tagged Before hook. This step
  // exists so the feature file reads naturally — a common and legitimate
  // pattern, but worth knowing that a step doing nothing is not always a bug.
  expect(this.state.currentToken).toBeDefined();
});

/**
 * ARRANGE-over-API, Cucumber edition.
 *
 * Note the manual bookkeeping: pushing the id onto `createdProjectIds` so the
 * After hook can clean up. The Playwright fixture does this automatically by
 * wrapping `create`, so it cannot be forgotten. Here it can, and when it is,
 * the symptom is not a failing test — it is a slowly filling test database and
 * an unrelated test breaking next week.
 */
Given('a project already exists', async function (this: TestWorld) {
  const project = await this.projectsApi.create(aProject());
  this.createdProjectIds.push(project.id);
  this.state.currentProject = project;
});

Given('I am on the dashboard', async function (this: TestWorld) {
  await this.dashboardPage.goto();
});

Given('I have opened the new project form', async function (this: TestWorld) {
  await this.dashboardPage.startCreateProject();
});

/**
 * NOTE: there is deliberately NO `When('I am viewing that project')` twin, even
 * though project-crud.feature uses the sentence after both `And` and `When`.
 *
 * Cucumber matches steps on TEXT ALONE — Given/When/Then are decoration for the
 * reader and carry no matching weight. Defining the same sentence twice raises
 * an "ambiguous step definition" error AT RUNTIME, and it names the step rather
 * than the scenario, so the failure points nowhere useful.
 *
 * This is the class of mistake the TypeScript spec cannot make: there, calling
 * a function twice is just calling a function. It was made and caught while
 * writing this very file, which is the most honest argument in the comparison.
 */
Given('I am viewing that project', async function (this: TestWorld) {
  const project = this.state.currentProject;
  // This guard is the price of passing data through `this` instead of a local
  // variable. Without it, a scenario that forgets the preceding Given fails
  // with `Cannot read properties of undefined`, which points at the wrong step.
  expect(project, 'no project in scenario state — is a Given step missing?').toBeDefined();
  await this.projectDetailPage.gotoProject(project!.id);
});

Given('I am signed in as a {string}', async function (this: TestWorld, role: string) {
  const { token } = await this.authApi.createUserAndLogin(
    aUser({ role: role as 'admin' | 'member' | 'viewer' }),
  );
  this.authenticateApi(token);
  await this.page.addInitScript((t: string) => {
    window.localStorage.setItem('auth.token', t);
  }, token);
});

When('I open the dashboard', async function (this: TestWorld) {
  await this.dashboardPage.goto();
});

When('I create a public project', async function (this: TestWorld) {
  const project = aProject({ visibility: 'public' });
  this.state.pendingProject = project;
  await this.createProjectPage.submit(project);
});

When('I rename it', async function (this: TestWorld) {
  const current = this.state.currentProject!;
  const newName = `${current.name}-renamed`;
  this.state.pendingProject = { ...aProject(), name: newName };
  await this.projectDetailPage.rename(newName);
});

Then('I should see that project listed', async function (this: TestWorld) {
  const name = this.state.currentProject?.name ?? this.state.pendingProject?.name;
  expect(name, 'no project name in scenario state').toBeDefined();
  await expect(this.dashboardPage.projectCard(name!)).toBeVisible();
});

Then(
  'the project should exist on the server with visibility {string}',
  async function (this: TestWorld, visibility: string) {
    // ASSERT-over-API, exactly as in the Playwright spec.
    const all = await this.projectsApi.list();
    const persisted = all.find((p) => p.name === this.state.pendingProject?.name);
    expect(persisted, 'project was not found via the API').toBeDefined();
    expect(persisted?.visibility).toBe(visibility);
  },
);

Then('the page title should show the new name', async function (this: TestWorld) {
  await expect(this.projectDetailPage.title).toHaveText(this.state.pendingProject!.name);
});

Then('I should see a confirmation toast', async function (this: TestWorld) {
  await expect(this.projectDetailPage.toast).toHaveText(/project renamed/i);
});

Then('the server should report the new name', async function (this: TestWorld) {
  const reloaded = await this.projectsApi.get(this.state.currentProject!.id);
  expect(reloaded.name).toBe(this.state.pendingProject!.name);
});

Then('the archive control should be {string}', async function (this: TestWorld, visibility: string) {
  if (visibility === 'visible') {
    await expect(this.projectDetailPage.archiveButton).toBeVisible();
  } else {
    await expect(this.projectDetailPage.archiveButton).toBeHidden();
  }
});
