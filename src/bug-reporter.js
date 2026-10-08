const fs = require("fs");
const path = require("path");

class BugReporter {
    onTestEnd(test, result) {
        if (result.status !== "failed") {
            return;
        }

        const bugReportsDirectory = path.join(
            process.cwd(),
            "bug-reports"
        );

        fs.mkdirSync(bugReportsDirectory, {
            recursive: true
        });

        const bugReport = {
            testName: test.title,
            status: result.status,
            errorMessage: result.error
                ? result.error.message
                : "Unknown error",
            timestamp: new Date().toISOString(),
            screenshot: null
        };

        const screenshotAttachment = result.attachments.find(
            (attachment) =>
                attachment.name === "screenshot" &&
                attachment.path
        );

        if (screenshotAttachment) {
            bugReport.screenshot = screenshotAttachment.path;
        }

        const safeTestName = test.title
            .replace(/[^a-z0-9]/gi, "-")
            .toLowerCase();

        const fileName = `${Date.now()}-${safeTestName}.json`;

        const filePath = path.join(
            bugReportsDirectory,
            fileName
        );

        fs.writeFileSync(
            filePath,
            JSON.stringify(bugReport, null, 2)
        );

        console.log(`Bug report created: ${filePath}`);
    }
}

module.exports = BugReporter;