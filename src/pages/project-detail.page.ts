import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { NavComponent } from '../components/nav.component';

export class ProjectDetailPage extends BasePage {
  /** Overridden below by `gotoProject()`; the bare path is only used when a
   *  test deep-links without an id, which the app redirects. */
  protected readonly path = '/projects';

  readonly nav: NavComponent;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
  }

  // ── Assertion surface ──
  get title(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }
  get description(): Locator {
    return this.page.getByTestId('project-description');
  }
  get visibilityBadge(): Locator {
    return this.page.getByTestId('project-visibility');
  }
  get toast(): Locator {
    return this.page.getByRole('status');
  }
  /** Exposed so permission tests can assert it is ABSENT. A test must never
   *  build this locator itself — see the assertion-surface note in
   *  `login.page.ts`. */
  get archiveButton(): Locator {
    return this.page.getByRole('button', { name: 'Archive project' });
  }

  /**
   * Deep-link straight to a project by id.
   *
   * THIS METHOD IS WHY API-ASSISTED SETUP PAYS OFF. The test creates a project
   * over HTTP in ~50ms, gets back an id, and jumps directly to its page — with
   * no login, no dashboard render, and no clicking. Compare with the UI route:
   * load login, sign in, wait for dashboard, find the card, click it.
   */
  async gotoProject(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}`);
  }

  async rename(newName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Rename' }).click();
    await this.page.getByLabel('Project name').fill(newName);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async archive(): Promise<void> {
    await this.page.getByRole('button', { name: 'Archive project' }).click();
    // The confirmation dialog is scoped, so "Archive" in the dialog can never
    // be confused with "Archive project" on the page behind it.
    await this.page
      .getByRole('dialog', { name: 'Archive project?' })
      .getByRole('button', { name: 'Archive' })
      .click();
  }
}
