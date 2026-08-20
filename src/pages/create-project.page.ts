import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { DashboardPage } from './dashboard.page';
import type { NewProject } from '../support/data-factory';

/**
 * The "new project" form.
 *
 * Modelled as its own page object even though it renders as a modal. The test
 * should not care whether it is a modal, a drawer or a full page — that is
 * precisely the implementation detail POM exists to hide. If the team later
 * turns it into a route, no test changes.
 */
export class CreateProjectPage extends BasePage {
  protected readonly path = '/projects/new';

  constructor(page: Page) {
    super(page);
  }

  private get form(): Locator {
    return this.page.getByRole('dialog', { name: 'New project' });
  }

  get validationError(): Locator {
    return this.form.getByRole('alert');
  }

  /**
   * Takes the SAME object the data factory produces.
   *
   * This is a small thing that pays off constantly: the test writes
   * `const project = aProject(); await createProject.submit(project);` and then
   * asserts against `project.name`. There is one source of truth for the data,
   * so a typo cannot make the assertion silently check the wrong string.
   */
  async submit(project: NewProject): Promise<DashboardPage> {
    await this.form.getByLabel('Project name').fill(project.name);
    await this.form.getByLabel('Description').fill(project.description);
    await this.form.getByLabel('Visibility').selectOption(project.visibility);
    await this.form.getByRole('button', { name: 'Create project' }).click();
    return new DashboardPage(this.page);
  }

  /** Submit without filling anything, for validation tests. */
  async submitEmpty(): Promise<void> {
    await this.form.getByRole('button', { name: 'Create project' }).click();
  }
}
