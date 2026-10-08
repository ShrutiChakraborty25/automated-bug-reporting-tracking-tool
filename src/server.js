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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});