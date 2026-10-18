
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = 3000;
const db = require("../database/db");

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bug Tracking Demo Application</title>
        </head>
        <body>
            <h1>Bug Tracking Demo Application</h1>
            <p id="welcome-message">Welcome to the demo application.</p>
            <button id="login-button">Login</button>
        </body>
        </html>
    `);
});

// Serve dashboard files from the public folder
app.use(express.static(path.join(__dirname, "../public")));

// API: Retrieve all bugs
app.get("/api/bugs", (req, res) => {
    try {
        const bugs = db.prepare(`
            SELECT
                bugs.id,
                bugs.title,
                bugs.severity,
                bugs.status,
                bugs.error_message,
                bugs.screenshot_path,
                bugs.created_at,
                tests.test_name,
                tests.status AS test_status,
                modules.name AS module_name
            FROM bugs
            LEFT JOIN tests ON bugs.test_id = tests.id
            LEFT JOIN modules ON bugs.module_id = modules.id
            ORDER BY bugs.id DESC
        `).all();

        res.json({
            success: true,
            count: bugs.length,
            bugs
        });
    } catch (error) {
        console.error("Error retrieving bugs:", error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve bug records."
        });
    }
});

// API: Update bug status
app.patch("/api/bugs/:id/status", (req, res) => {
    try {
        const bugId = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(bugId) || bugId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid bug ID."
            });
        }

        const allowedStatuses = ["Open", "In Progress", "Resolved"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Open, In Progress, or Resolved."
            });
        }

        const result = db.prepare(`
            UPDATE bugs
            SET status = ?
            WHERE id = ?
        `).run(status, bugId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Bug not found."
            });
        }

        res.json({
            success: true,
            message: "Bug status updated successfully.",
            bugId,
            status
        });
    } catch (error) {
        console.error("Error updating bug status:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update bug status."
        });
    }
});

// API: Retrieve bug statistics
app.get("/api/bugs/stats", (req, res) => {
    try {
        const total = db.prepare(`
            SELECT COUNT(*) AS count FROM bugs
        `).get().count;

        const statusStats = db.prepare(`
            SELECT status, COUNT(*) AS count
            FROM bugs
            GROUP BY status
        `).all();

        const severityStats = db.prepare(`
            SELECT severity, COUNT(*) AS count
            FROM bugs
            GROUP BY severity
        `).all();

        res.json({
            success: true,
            totalBugs: total,
            byStatus: statusStats,
            bySeverity: severityStats
        });
    } catch (error) {
        console.error("Error retrieving bug statistics:", error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve bug statistics."
        });
    }
});

// API: View a bug's screenshot
app.get("/api/bugs/:id/screenshot", (req, res) => {
    try {
        const bugId = Number(req.params.id);

        if (!Number.isInteger(bugId) || bugId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid bug ID."
            });
        }

        const bug = db.prepare(`
            SELECT screenshot_path
            FROM bugs
            WHERE id = ?
        `).get(bugId);

        if (!bug) {
            return res.status(404).json({
                success: false,
                message: "Bug not found."
            });
        }

        if (!bug.screenshot_path) {
            return res.status(404).json({
                success: false,
                message: "No screenshot available for this bug."
            });
        }

        const resultsDirectory = path.resolve(process.cwd(), "test-results");
        const screenshotPath = path.resolve(
            process.cwd(),
            bug.screenshot_path
        );

        // Ensure the requested file is inside test-results
        if (
            !screenshotPath.startsWith(resultsDirectory + path.sep) ||
            !fs.existsSync(screenshotPath) ||
            !fs.statSync(screenshotPath).isFile()
        ) {
            return res.status(404).json({
                success: false,
                message: "Screenshot file not found."
            });
        }

        res.sendFile(screenshotPath);
    } catch (error) {
        console.error("Screenshot retrieval error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve screenshot."
        });
    }
});


app.get("/api/bugs/export", (req, res) => {
  try {
    const bugs = db.prepare(`
      SELECT
        bugs.id,
        bugs.title,
        modules.name AS module_name,
        bugs.severity,
        bugs.status,
        bugs.error_message,
        bugs.screenshot_path,
        bugs.created_at,
        tests.test_name,
        tests.status AS test_status
      FROM bugs
      LEFT JOIN tests ON bugs.test_id = tests.id
      LEFT JOIN modules ON bugs.module_id = modules.id
      ORDER BY bugs.id DESC
    `).all();

    const headers = [
      "Bug ID",
      "Title",
      "Module",
      "Severity",
      "Status",
      "Error Message",
      "Screenshot Path",
      "Created At",
      "Test Name",
      "Test Status"
    ];

    // Escape CSV values and prevent spreadsheet formula injection.
    const escapeCsv = value => {
      let text = String(value ?? "");

      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = bugs.map(bug => [
      bug.id,
      bug.title,
      bug.module_name,
      bug.severity,
      bug.status,
      bug.error_message,
      bug.screenshot_path,
      bug.created_at,
      bug.test_name,
      bug.test_status
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="bug-reports.csv"'
    );

    res.send("\uFEFF" + csv);


const PDFDocument = require("pdfkit");

app.get("/api/bugs/export/pdf", (req, res) => {
    try {
        const bugs = db.prepare(`
            SELECT
                bugs.id,
                bugs.title,
                modules.name AS module_name,
                bugs.severity,
                bugs.status,
                bugs.error_message,
                bugs.created_at,
                tests.test_name
            FROM bugs
            LEFT JOIN tests ON bugs.test_id = tests.id
            LEFT JOIN modules ON bugs.module_id = modules.id
            ORDER BY bugs.id DESC
        `).all();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="bug-reports.pdf"'
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        doc.fontSize(20).text("Bug Reports", { align: "center" });
        doc.moveDown();
        doc.fontSize(10).text(`Total Bugs: ${bugs.length}`);
        doc.moveDown();

        bugs.forEach((bug, index) => {
            if (doc.y > 700) {
                doc.addPage();
            }

            doc.fontSize(13).text(`${index + 1}. ${bug.title || "Untitled"}`);
            doc.fontSize(10);
            doc.text(`Bug ID: ${bug.id}`);
            doc.text(`Module: ${bug.module_name || "Unknown"}`);
            doc.text(`Severity: ${bug.severity}`);
            doc.text(`Status: ${bug.status}`);
            doc.text(`Test: ${bug.test_name || "Unknown"}`);
            doc.text(`Created At: ${bug.created_at || "Unknown"}`);
            doc.text(`Error: ${bug.error_message || "No error details"}`);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error("PDF export error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Unable to export bug reports to PDF."
            });
        } else {
            res.destroy(error);
        }
    }
});


  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to export bug reports."
    });
  }
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
