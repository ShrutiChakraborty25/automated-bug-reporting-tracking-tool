# Automated Bug Reporting & Tracking Tool

## M.Tech Software Systems Project

An automated bug reporting and tracking system that captures test failures, stores bug information, categorizes defects, and provides a web-based dashboard for bug monitoring and analysis.

## Project Objectives

* Automatically detect failures from Playwright tests
* Capture screenshots and error logs for failed tests
* Categorize bugs by severity and module
* Store test and bug information in SQLite
* Provide REST APIs using Express.js
* Provide a web dashboard for bug tracking
* Search and filter bugs
* Update bug status
* Display analytics and charts
* Demonstrate an end-to-end automated bug reporting workflow

## Technology Stack

* JavaScript
* Node.js
* Playwright
* Express.js
* SQLite
* HTML
* CSS
* Chart.js
* Git
* GitHub

## Project Structure

```text
automated-bug-reporting-tracking-tool/
│
├── tests/
├── src/
├── database/
├── dashboard/
├── docs/
├── screenshots/
├── .gitignore
└── README.md


## Project Status

## Project Status

### Day 1
- Development environment setup completed
- GitHub repository created
- Initial project structure created
- README and .gitignore added
- Initial Git commit pushed to GitHub

### Day 2
- Node.js project initialized
- Express.js installed
- Basic Express server created
- Local development server tested successfully

### Day 3
- Playwright installed
- Playwright browsers installed
- Demo web application created
- Playwright configuration created
- First end-to-end browser test created
- Automated test executed successfully
- Screenshot-on-failure configuration added

### Day 4
- Configured Playwright failure screenshot capture
- Configured Playwright trace retention on failure
- Created an intentional failing test
- Verified Playwright failure detection
- Verified failure screenshot generation
- Observed Playwright error information

### Day 5
- Created custom Playwright bug reporter
- Automatically detected failed tests
- Automatically captured test error information
- Automatically located failure screenshots
- Generated structured JSON bug reports
- Added generated bug reports to .gitignore

### Day 6
- Installed SQLite database library
- Created SQLite database connection
- Designed modules table
- Designed tests table
- Designed bugs table
- Added relationships between bugs, tests and modules
- Verified database tables successfully
- Added SQLite database files to .gitignore


### Day 7
- Connected the Playwright custom reporter to SQLite.
- Stored failed test executions in the tests table.
- Stored bug records linked to test executions.
- Saved error messages and available screenshot paths.
- Verified generated bug records using a database query.
- Set initial bug severity to Major and status to Open.
