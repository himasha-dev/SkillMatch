Feature: Apply for an internship
  As a candidate with a qualification profile
  I want to apply to open internships before they close
  So that companies can consider me for the role

  Background:
    Given I am a logged-in candidate with a completed profile

  Scenario: Candidate applies before the deadline
    Given an active internship "QA Automation Intern" that closes in 5 days
    When I apply to "QA Automation Intern" with the cover note "I enjoy breaking things safely"
    Then my application is accepted
    And the application status is "submitted"
    And the application history starts with "Application submitted"

  Scenario: Candidate cannot apply after the deadline
    Given an active internship "Data Intern" that closed 1 day ago
    When I apply to "Data Intern" with the cover note "Better late than never"
    Then my application is refused with status 400 and message "The application deadline has passed"

  Scenario Outline: Cover note length limit
    Given an active internship "Backend Intern" that closes in 5 days
    When I apply to "Backend Intern" with a cover note of <length> characters
    Then the response status is <status>

    Examples:
      | length | status |
      | 999    | 201    |
      | 1000   | 201    |
      | 1001   | 400    |
