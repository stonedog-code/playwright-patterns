import { test, expect } from '../../src/fixtures/test';
import { aProject } from '../../src/support/data-factory';

/**
 * THE FLAGSHIP EXAMPLE OF API-ASSISTED UI TESTING.
 *
 * Read the three tests below in order — each shows a different, deliberate
 * split between what is done over HTTP and what is done through the browser.
 *
 * The governing rule:
 *
 *     Arrange over the API. Act through the UI. Assert through both.
 *
 * "Assert through both" is the part most suites skip, and it is what catches
 * the bug where the UI optimistically renders something the server never saved.
 */

test.describe('Projects', () => {
  test('a project created via API is visible on the dashboard', async ({
    projectsApi,
    dashboardPage,
  }) => {
    // ── ARRANGE ─────────────────────────────────────────────────────────────
    // Set up over HTTP. This is ~50ms and cannot flake on a render.
    //
    // Doing it through the UI instead would mean: open dashboard, click New
    // project, fill three fields, submit, wait for the modal to close — five
    // interactions of unrelated surface area, every one of which can break for
    // reasons that have nothing to do with "does the dashboard list projects".
    //
    // The project is registered for automatic deletion by the `projectsApi`
    // fixture, so there is no cleanup code in this test and none is needed even
    // if it fails partway through.
    const project = await projectsApi.create(aProject());

    // ── ACT ─────────────────────────────────────────────────────────────────
    await dashboardPage.goto();

    // ── ASSERT ──────────────────────────────────────────────────────────────
    await expect(dashboardPage.projectCard(project.name)).toBeVisible();
  });

  test('a project created through the UI is persisted server-side', async ({
    dashboardPage,
    createProjectPage,
    projectsApi,
  }) => {
    // ── ARRANGE ──
    // The data is built by the factory so the assertions below compare against
    // the SAME object the form was filled from — no duplicated string literals
    // that can drift apart.
    const project = aProject({ visibility: 'public' });
    await dashboardPage.goto();
    await dashboardPage.startCreateProject();

    // ── ACT ──
    // Here the UI IS the subject, so creation goes through the form. This is
    // the inverse of the previous test, and between them the create path is
    // covered from both directions.
    await createProjectPage.submit(project);

    // ── ASSERT (UI) ──
    await expect(dashboardPage.projectCard(project.name)).toBeVisible();

    // ── ASSERT (API) ──
    // The assertion that a UI-only test cannot make. It proves the record
    // reached the server with the right FIELDS — a UI list showing the name
    // says nothing about whether `visibility` was saved correctly, and an
    // optimistic render would satisfy the check above while persisting nothing.
    const all = await projectsApi.list();
    const persisted = all.find((p) => p.name === project.name);

    expect(persisted, `project "${project.name}" was not found via the API`).toBeDefined();
    expect(persisted?.visibility).toBe('public');
    expect(persisted?.description).toBe(project.description);
  });

  test('renaming a project updates both the page and the server', async ({
    projectsApi,
    projectDetailPage,
  }) => {
    // ── ARRANGE ──
    // Two API calls and a deep link replace an entire click-path. Note the test
    // never visits the dashboard at all: it goes straight to the page under
    // test using the id the API just handed back.
    const original = await projectsApi.create(aProject());
    const newName = `${original.name}-renamed`;
    await projectDetailPage.gotoProject(original.id);
    await expect(projectDetailPage.title).toHaveText(original.name);

    // ── ACT ──
    await projectDetailPage.rename(newName);

    // ── ASSERT (UI) ──
    await expect(projectDetailPage.title).toHaveText(newName);
    await expect(projectDetailPage.toast).toHaveText(/project renamed/i);

    // ── ASSERT (API) ──
    const reloaded = await projectsApi.get(original.id);
    expect(reloaded.name).toBe(newName);
  });

  test('the empty state shows when the account has no projects', async ({
    dashboardPage,
  }) => {
    // ── ARRANGE ──
    // Nothing to arrange — and that is worth a comment rather than a silent
    // omission. This test depends on the seeded QA account starting empty.
    //
    // THAT IS A LATENT FLAKE, and naming it is the honest thing to do: any
    // parallel test that creates a project for this user breaks it. The fix in
    // a real repo is to run this one as a throwaway user
    // (`authApi.createUserAndLogin(aUser())`) so it owns its own empty account.
    // Left as-is here to show what the smell looks like.

    // ── ACT ──
    await dashboardPage.goto();

    // ── ASSERT ──
    await expect(dashboardPage.emptyState).toBeVisible();
  });
});

test.describe('Projects — permissions', () => {
  test('a viewer cannot see the archive control', async ({
    authApi,
    projectsApi,
    projectDetailPage,
    page,
  }) => {
    // ── ARRANGE ──
    // A test needing a DIFFERENT user than the shared QA account. Creating one
    // over the API is cheap and gives this test complete isolation — nothing it
    // does can affect any other test's user.
    const project = await projectsApi.create(aProject({ visibility: 'public' }));
    const { token } = await authApi.createUserAndLogin({
      email: `viewer-${project.id}@example.com`,
      fullName: 'Read Only Rita',
      role: 'viewer',
    });

    // Swap the browser's identity to the new user.
    await page.addInitScript((t: string) => {
      window.localStorage.setItem('auth.token', t);
    }, token);

    // ── ACT ──
    await projectDetailPage.gotoProject(project.id);

    // ── ASSERT ──
    await expect(projectDetailPage.title).toHaveText(project.name);
    await expect(projectDetailPage.archiveButton).toBeHidden();
  });
});
