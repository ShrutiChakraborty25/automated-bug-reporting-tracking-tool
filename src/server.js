const express = require("express");

const app = express();

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


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});