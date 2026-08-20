import type { Locator, Page } from '@playwright/test';

/**
 * A COMPONENT object, not a page object.
 *
 * The distinction matters: the nav bar appears on every screen. Duplicating its
 * locators into each page object means a markup change breaks N files. Model it
 * once and compose it into the pages that show it.
 *
 * Note `page.getByRole('navigation')` scoping — every locator below is resolved
 * WITHIN the nav, so a "Projects" link in the page body can never be matched by
 * accident. Unscoped locators that happen to be unique today are a latent
 * strict-mode violation the moment someone adds a second match.
 */
export class NavComponent {
  private readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('navigation', { name: 'Main' });
  }

  /** Exposed for assertions — see the note on the assertion surface in
   *  `login.page.ts`. */
  get userMenuButton(): Locator {
    return this.root.getByRole('button', { name: /account menu/i });
  }

  async goToProjects(): Promise<void> {
    await this.root.getByRole('link', { name: 'Projects' }).click();
  }

  async signOut(): Promise<void> {
    await this.userMenuButton.click();
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
  }

  /** Returns DATA, not a locator — the caller wants the name, not the element. */
  async signedInUserName(): Promise<string> {
    return (await this.userMenuButton.innerText()).trim();
  }
}
