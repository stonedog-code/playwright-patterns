# Playwright specs vs Cucumber — a like-for-like comparison

Both directories test **the same application, through the same page objects and
the same API helpers**. Only the test-authoring layer differs. That is what
makes the comparison fair, and it is also the most important finding on its own.

All numbers below are **measured from this repo** with comments and blank lines
stripped, not estimated.

---

## The headline result

> **The POM and API layers are framework-independent.**
>
> `src/pages/`, `src/components/`, `src/api/` and `src/support/` — **341 code
> lines** — are imported *unchanged* by both suites. Cucumber's `World` builds
> the very same `LoginPage` class the Playwright fixture builds.

If you get the `src/` structure right, the choice of runner is reversible and
cheap. If you get it wrong — locators in specs, HTTP calls in step definitions —
the choice is permanent, because the tests *are* the structure.

**Decide the POM/API layer carefully. Treat the runner as a preference.**

---

## Measured cost

| | Playwright | Cucumber |
|---|---:|---:|
| Test-authoring layer (specs / features + steps + world + hooks + config) | **234** | **274** |
| Shared POM + API + support | 341 | 341 (identical files) |

Same three login scenarios, three ways:

| File | Code lines |
|---|---:|
| `tests/auth/login.spec.ts` | **26** |
| `cucumber/features/login.feature` | 18 |
| `cucumber/steps/login.steps.ts` | 36 |
| → Cucumber total for the same coverage | **54** (2.1×) |

Infrastructure required to reach feature parity:

| | Code lines |
|---|---:|
| `src/fixtures/test.ts` (Playwright DI + cleanup) | **84** |
| `cucumber/support/world.ts` + `hooks.ts` | **103** |

The 103 lines are not doing more — they are hand-rebuilding browser lifecycle,
timeouts, per-worker token caching, screenshot-on-failure and cleanup, **all of
which Playwright provides from config**. There are still no traces and no video
in the Cucumber suite; adding them is more of the same file.

---

## Where each one genuinely wins

### Cucumber wins

- **A non-engineer can read `login.feature` and tell you whether it is right.**
  This is the entire case for BDD, it is real, and no amount of clean TypeScript
  substitutes for it. If a product owner, a domain expert or a compliance
  auditor *actually reads and signs off on scenarios*, that is worth the cost.
- **`Scenario Outline` beats a `for` loop.** Compare the role/visibility table
  in `project-crud.feature` with what the same coverage looks like as a loop
  around `test()`.
- **Step reuse across features is real** once a domain vocabulary settles.
- **Tagged hooks** (`@authenticated`) recover some of the fixture laziness.

### Playwright wins

- **Errors are caught at compile time, not run time.** A Playwright test naming
  a fixture that does not exist fails `tsc`. A Cucumber step whose sentence
  drifts from its regex fails mid-run as "undefined step".
- **Fixtures are lazy; the World is not.** Every World field is built for every
  scenario. A fixture is built only if a test names it.
- **Teardown sits next to setup, in the same function, and runs on failure.**
  In Cucumber they are in different files and must be kept in sync by hand.
- **Cleanup cannot be forgotten.** The `projectsApi` fixture wraps `create` to
  record what it made. In Cucumber, the step author must remember
  `this.createdProjectIds.push(...)` — and the symptom of forgetting is not a
  failing test, it is a slowly filling database and an unrelated test breaking
  next week.
- **Data flows as local variables, not through `this`.** In a spec,
  `const project = await projectsApi.create(...)` is in scope for the
  assertions three lines down. In Cucumber it must be stashed on the World, and
  every consumer needs a guard for "what if the Given did not run".
- **`--ui` mode, traces, video, and flake-aware retries** exist and are one
  config line each.

---

## Two bugs found while writing this, both instructive

Neither is hypothetical — both happened during authoring and are preserved in
the comments where they occurred.

**1. An ambiguous step definition.** `I am viewing that project` was defined as
both a `Given` and a `When`. Cucumber matches on **text alone** — the keyword is
decoration — so this is an ambiguous-step error, and it surfaces at *runtime*,
naming the step rather than the scenario. The TypeScript spec cannot make this
mistake: calling a function twice is just calling a function.

**2. A dead loader recipe.** `loader: ['tsx/esm']` — the incantation in most
Cucumber+TypeScript guides — fails on Node ≥ 20.6 because `--loader` was
deprecated. The fix is `NODE_OPTIONS='--import tsx'`. **Playwright transpiles
TypeScript itself and needs none of this.**

Both are examples of the same underlying difference: Cucumber has more moving
parts between the sentence you write and the code that runs, and each joint is a
place to be wrong at runtime.

---

## The recommendation

**Use the Playwright spec style by default.** Adopt Cucumber only when you can
name the specific non-engineer who will read the feature files — and then check
back in three months whether they still do. A Gherkin suite nobody outside the
team reads has paid the entire cost of BDD for none of its benefit, and it is
the most common way BDD adoptions end.

**Either way, build `src/` the way this repo does.** That is the part that
determines whether the suite is maintainable, and it is the same either way.

---

## How to verify these claims yourself

```bash
npm install
npm run typecheck            # 21 files, exit 0
npm run test:cucumber:dry    # 9 scenarios, 46 steps, 0 undefined
```

Neither command launches a browser. The suites are **structural examples and are
not expected to run against a real application** — there is no app at
`demo.example.com`. What is verified is that the code compiles and that every
Gherkin sentence resolves to a step definition.
