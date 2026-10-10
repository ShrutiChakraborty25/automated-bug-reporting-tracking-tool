const express = require("express");

const app = express();

app.use(express.json());

const PORT = 3000;

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


const db = require("../database/db");

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
            bugs: bugs
        });
    } catch (error) {
        console.error("Error retrieving bugs:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve bug records."
        });
    }
});


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

        const allowedStatuses = [
            "Open",
            "In Progress",
            "Resolved"
        ];

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


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});