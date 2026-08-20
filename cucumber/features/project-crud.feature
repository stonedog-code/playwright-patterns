# The SAME scenarios as tests/projects/project-crud.spec.ts.
#
# The interesting line is the first Given in each scenario: "a project already
# exists" is doing exactly what the spec's ARRANGE block did — creating the
# record over the API rather than through the UI. The API-assisted setup pattern
# survives the move to Cucumber intact, which is the important finding. What
# changes is that the reader of this file CANNOT TELL that is happening. To a
# stakeholder that is a feature (irrelevant detail hidden); to the engineer
# debugging a failure it is a step they must go and look up.

Feature: Projects
  As a signed-in user
  I want to create and manage projects
  So that I can organise my work

  Background:
    Given I am signed in

  Scenario: A project created via API is visible on the dashboard
    Given a project already exists
    When I open the dashboard
    Then I should see that project listed

  Scenario: A project created through the UI is persisted server-side
    Given I am on the dashboard
    And I have opened the new project form
    When I create a public project
    Then I should see that project listed
    And the project should exist on the server with visibility "public"

  Scenario: Renaming a project updates both the page and the server
    Given a project already exists
    And I am viewing that project
    When I rename it
    Then the page title should show the new name
    And I should see a confirmation toast
    And the server should report the new name

  # Scenario Outline is the one thing Gherkin does more neatly than the
  # TypeScript spec, where the equivalent is a `for (const role of [...])` loop
  # wrapping a `test()` call. Both work; this reads better in a review.
  Scenario Outline: Only privileged roles see the archive control
    Given a project already exists
    And I am signed in as a "<role>"
    When I am viewing that project
    Then the archive control should be "<visibility>"

    Examples:
      | role   | visibility |
      | admin  | visible    |
      | member | visible    |
      | viewer | hidden     |
