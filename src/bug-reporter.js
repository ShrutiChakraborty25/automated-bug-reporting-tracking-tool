
const fs = require("fs");
const path = require("path");
const db = require("../database/db");

class BugReporter {
    onTestEnd(test, result) {
        if (result.status !== "failed") {
            return;
        }

        const errorMessage = result.error?.message || "Unknown error";

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

        // Store the bug, including its module ID.
        db.prepare(`
            INSERT INTO bugs
            (test_id, module_id, title, severity, status,
             error_message, screenshot_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            testResult.lastInsertRowid,
            moduleId,
            test.title,
            "Major",
            "Open",
            errorMessage,
            screenshotPath,
            timestamp
        );

        // Keep a JSON report as well.
        const reportDirectory = path.join(process.cwd(), "bug-reports");
        fs.mkdirSync(reportDirectory, { recursive: true });

        const report = {
            testName: test.title,
            status: result.status,
            module: moduleName,
            errorMessage,
            screenshotPath,
            timestamp
        };

        const filename = `${Date.now()}-bug-report.json`;

        fs.writeFileSync(
            path.join(reportDirectory, filename),
            JSON.stringify(report, null, 2)
        );

        console.log(`Bug saved to SQLite: ${test.title} (${moduleName})`);
    }
}

module.exports = BugReporter;
