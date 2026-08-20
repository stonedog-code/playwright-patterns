# playwright-patterns

A **reference structure** for a Playwright end-to-end repo: page objects,
dependency injection, API-assisted setup, and the AAA pattern — with the same
suite mirrored in Cucumber so the two can be compared directly.

> **These tests are not meant to run.** There is no application at
> `demo.example.com`. This repo is about *structure*. What is verified is that
> it typechecks and that every Cucumber step resolves — see *Verifying* below.

## Read it in this order

| # | File | What it demonstrates |
|---|---|---|
| 1 | `src/pages/login.page.ts` | POM, and the **one design tension** — why exposing named `Locator`s for assertions makes a suite *less* flaky, not more coupled |
| 2 | `src/fixtures/test.ts` | **The DI container.** Playwright fixtures as injection, worker vs test scope, and cleanup that cannot be forgotten |
| 3 | `src/api/projects.api.ts` | API helpers, and the rule for when to use them |
| 4 | `tests/projects/project-crud.spec.ts` | **The flagship.** AAA with API-arranged setup and dual UI+API assertions |
| 5 | `tests/auth/auth.setup.ts` | Logging in once for the whole suite instead of once per test |
| 6 | `cucumber/support/world.ts` | The same page objects, injected the Cucumber way |
| 7 | `docs/comparison.md` | **Measured** comparison of the two approaches |

## The four rules this repo exists to demonstrate

**1. A test never constructs a locator.** `page.locator(...)` or `page.getByRole(...)`
in a spec is a review reject. Selectors live in page objects and nowhere else.
Enforceable:

```bash
grep -rn "page\.\(getBy\|locator\)" tests/    # must return nothing
```

**2. Page objects are injected, never constructed in a test.** A spec declares
what it needs by naming it — `async ({ loginPage, projectsApi }) => ...` — and
Playwright builds exactly those, in order, with teardown attached.

**3. Arrange over the API. Act through the UI. Assert through both.**

```ts
const project = await projectsApi.create(aProject());   // ARRANGE — HTTP, ~50ms
await projectDetailPage.gotoProject(project.id);        // ACT     — the subject
await expect(projectDetailPage.title).toHaveText(...);  // ASSERT  — what the user sees
expect((await projectsApi.get(project.id)).name)...     // ASSERT  — what was saved
```

Setting up through the UI attaches unrelated flake to every test. Asserting
*only* through the UI cannot distinguish a saved record from an optimistic
render that vanishes on refresh.

**4. Every test block is labelled `ARRANGE` / `ACT` / `ASSERT`.** If ACT has
three steps in it, the test has three tests' worth of scope.

## Layout

```
playwright-patterns/
├── src/                      # SHARED by both suites — see docs/comparison.md
│   ├── pages/                #   POM: the only place selectors live
│   ├── components/           #   cross-page fragments (nav bar)
│   ├── api/                  #   the only place HTTP lives
│   ├── fixtures/test.ts      #   the DI container
│   └── support/              #   env access + test-data factories
├── tests/                    # Playwright specs, AAA-annotated
├── cucumber/                 # the SAME scenarios in Gherkin
│   ├── features/ steps/ support/
└── docs/comparison.md        # measured comparison + recommendation
```

## Verifying

```bash
npm install                  # no browsers needed for the checks below
npm run typecheck            # tsc over 21 files
npm run check:steps          # every Gherkin sentence resolves to a step
```

Both were run and confirmed non-vacuous, and one of them had to be fixed to
earn that claim. A planted type error is caught — `tsc` exits 2. But
`cucumber-js --dry-run` **reports** an undefined step and then **exits 0
anyway**, with or without `--strict` (which only covers *pending* steps), so
as a merge gate it could never fail a build: it prints "1 undefined" in yellow
and CI, which reads the exit code, calls it a pass. "Reported" is not "caught".

`npm run check:steps` (`scripts/check-steps.sh`) reads the summary instead and
fails on undefined steps, ambiguous steps, **and zero scenarios** — the last so
a config or path change that stops matching any `.feature` file cannot report a
clean run over nothing. All three were proven by planting each failure and
watching the check go red, then confirming the healthy tree still passes.

To actually run against a real app you would additionally need
`npx playwright install`, a live `BASE_URL`, and a seeded QA account.

## Adding a page

1. `src/pages/<name>.page.ts` — extend `BasePage`, private locators, public
   behaviour methods, named locators for the assertion surface.
2. Add a field to `PageFixtures` in `src/fixtures/test.ts` and one line to build it.
3. Every spec can now request it by name.

For Cucumber, additionally add the field to `TestWorld` and construct it in
`initialise()` — the duplication is one of the costs quantified in
`docs/comparison.md`.

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
Copyright 2026 nehsa.net.
