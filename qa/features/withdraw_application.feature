Feature: Withdraw an application
  As a candidate
  I want to withdraw applications I no longer want to pursue
  But I must not be able to withdraw a decision that has already been made

  Background:
    Given I am a logged-in candidate with a completed profile

  Scenario: Withdraw an application that is still being reviewed
    Given I have an application for "Frontend Intern" with status "reviewing"
    When I withdraw my application for "Frontend Intern"
    Then the response status is 200
    And the application status is "withdrawn"

  Scenario: An offered application cannot be withdrawn
    Given I have an application for "Java Intern" with status "offered"
    When I withdraw my application for "Java Intern"
    Then my application is refused with status 400 and message "An application that is offered cannot be withdrawn"
    And the application status is "offered"
