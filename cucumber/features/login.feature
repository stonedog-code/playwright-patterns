# The SAME three cases as tests/auth/login.spec.ts, written in Gherkin.
#
# Read this file, then read the spec, then read cucumber/steps/login.steps.ts.
# The comparison is the point of this directory.
#
# What Gherkin buys: this file is readable by someone who cannot read
# TypeScript. If a product owner or a compliance auditor genuinely reads and
# signs off on scenarios, that is worth real money and no amount of clean
# TypeScript substitutes for it.
#
# What it costs: the AAA structure that was explicit in the spec
# (`// ── ARRANGE ──`) is now implicit in Given/When/Then, the setup shortcut
# via API has to hide inside a Given step, and every line here needs a matching
# regex somewhere else in the repo.

Feature: Login
  As a registered user
  I want to sign in
  So that I can reach my projects

  # Background maps to Playwright's beforeEach. Note it CANNOT be conditional:
  # every scenario in the file pays for it, whether it needs it or not. The
  # fixture system's laziness has no equivalent here.
  Background:
    Given I am signed out
    And I am on the login page

  Scenario: A registered user can sign in with valid credentials
    When I sign in with valid credentials
    Then I should see the projects dashboard
    And I should see my account menu

  Scenario: An invalid password is rejected with a visible error
    When I sign in with the password "definitely-the-wrong-password"
    Then I should see the error "invalid email or password"
    And I should still be on the login page

  Scenario: Submitting an empty form shows field validation
    When I submit the login form without filling it in
    Then I should see a validation error
