import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { NavComponent } from '../components/nav.component';
import { ProjectDetailPage } from './project-detail.page';

export class DashboardPage extends BasePage {
  protected readonly path = '/dashboard';

  /** Composed, not inherited. The dashboard HAS a nav; it is not a KIND of nav.
   *  Composition also means a page without a nav simply does not declare one. */
  readonly nav: NavComponent;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Your projects' });
  }

  get emptyState(): Locator {
    return this.page.getByText('No projects yet');
  }

  /** The list container, scoped so `projectCard()` below can never match a
   *  stray element elsewhere on the page. */
  private get projectList(): Locator {
    return this.page.getByRole('list', { name: 'Projects' });
  }

  /**
   * A PARAMETERISED locator — the pattern that makes list assertions clean.
   *
   * Returning a Locator (not a boolean) is deliberate: it lets the test write
   * `await expect(dashboard.projectCard(name)).toBeVisible()`, which RETRIES.
   * A `hasProject(name): Promise<boolean>` helper would sample once and race
   * the render, which is exactly the flake described in `login.page.ts`.
   */
  projectCard(projectName: string): Locator {
    return this.projectList.getByRole('listitem').filter({ hasText: projectName });
  }

  /**
   * Navigate into a project.
   *
   * RETURNS THE NEXT PAGE OBJECT. This is the "page transition" pattern: the
   * method that causes navigation hands back the object representing where you
   * landed, so the test cannot accidentally keep using the old page's methods
   * after leaving it. It also documents the app's navigation graph in code.
   */
  async openProject(projectName: string): Promise<ProjectDetailPage> {
    await this.projectCard(projectName).getByRole('link', { name: projectName }).click();
    return new ProjectDetailPage(this.page);
  }

  async startCreateProject(): Promise<void> {
    await this.page.getByRole('button', { name: 'New project' }).click();
  }

  /** Returns DATA. Appropriate here because the test wants to reason about the
   *  collection (ordering, membership) rather than assert on one element. Note
   *  the caller is responsible for having waited for the list to settle first —
   *  which is why tests assert on `projectCard()` before calling this. */
  async visibleProjectNames(): Promise<string[]> {
    return this.projectList.getByRole('listitem').allInnerTexts();
  }
}
