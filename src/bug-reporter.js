
const fs = require("fs");
const path = require("path");
const db = require("../database/db");

class BugReporter {
    onTestEnd(test, result) {
        if (result.status !== "failed") {
            return;
        }

        const errorMessage = result.error?.message || "Unknown error";
        const errorText = errorMessage.toLowerCase();

        // Classify bug severity.
        let severity = "Minor";

        if (
            errorText.includes("crash") ||
            errorText.includes("critical") ||
            errorText.includes("data loss")
        ) {
            severity = "Critical";
        } else if (
            errorText.includes("timeout") ||
            errorText.includes("not found") ||
            errorText.includes("not visible")
        ) {
            severity = "Major";
        }

        // Find screenshot.
        const screenshot = result.attachments.find(
            (attachment) =>
                attachment.name === "screenshot" && attachment.path
        );

        const screenshotPath = screenshot
            ? path.relative(process.cwd(), screenshot.path)
            : null;

        const timestamp = new Date().toISOString();

        // Save the test execution.
        const testResult = db.prepare(`
            INSERT INTO tests (test_name, status, executed_at)
            VALUES (?, ?, ?)
        `).run(test.title, result.status, timestamp);

        // Identify the application module.
        const moduleRules = [
            { keyword: "login", name: "Login" },
            { keyword: "dashboard", name: "Dashboard" },
            { keyword: "user", name: "User Management" },
            { keyword: "report", name: "Reports" }
        ];

        const matchedModule = moduleRules.find((item) =>
            test.title.toLowerCase().includes(item.keyword)
        );

        const moduleName = matchedModule
            ? matchedModule.name
            : "Dashboard";

        const moduleRow = db.prepare(`
            SELECT id FROM modules WHERE name = ?
        `).get(moduleName);

        const moduleId = moduleRow ? moduleRow.id : null;

        // Check whether this test and module already have a bug.
        const existingBug = moduleId
            ? db.prepare(`
                SELECT bugs.id
                FROM bugs
                JOIN tests ON bugs.test_id = tests.id
                WHERE tests.test_name = ?
                  AND bugs.module_id = ?
                ORDER BY bugs.id DESC
                LIMIT 1
            `).get(test.title, moduleId)
            : null;

        if (existingBug) {
            // Update the existing bug instead of inserting a duplicate.
            db.prepare(`
                UPDATE bugs
                SET test_id = ?,
                    severity = ?,
                    status = 'Open',
                    error_message = ?,
                    screenshot_path = ?,
                    created_at = ?
                WHERE id = ?
            `).run(
                testResult.lastInsertRowid,
                severity,
                errorMessage,
                screenshotPath,
                timestamp,
                existingBug.id
            );

            console.log(
                `Existing bug updated: ${test.title} (${moduleName})`
            );
        } else {
            // Insert a new bug only when one does not already exist.
            db.prepare(`
                INSERT INTO bugs
                (test_id, module_id, title, severity, status,
                 error_message, screenshot_path, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                testResult.lastInsertRowid,
                moduleId,
                test.title,
                severity,
                "Open",
                errorMessage,
                screenshotPath,
                timestamp
            );

            console.log(
                `New bug saved: ${test.title} (${moduleName})`
            );
        }

        // Save the JSON report.
        const reportDirectory = path.join(
            process.cwd(),
            "bug-reports"
        );

        fs.mkdirSync(reportDirectory, { recursive: true });

        const report = {
            testName: test.title,
            status: result.status,
            module: moduleName,
            severity,
            errorMessage,
            screenshotPath,
            timestamp
        };

        const filename = `${Date.now()}-bug-report.json`;

        fs.writeFileSync(
            path.join(reportDirectory, filename),
            JSON.stringify(report, null, 2)
        );
    }
}

module.exports = BugReporter;
