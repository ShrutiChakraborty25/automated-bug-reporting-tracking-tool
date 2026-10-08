const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",

    reporter: [
        ["list"],
        ["./src/bug-reporter.js"]
    ],

    use: {
        baseURL: "http://localhost:3000",
        headless: true,
        screenshot: "only-on-failure",
        trace: "retain-on-failure"
    },

    webServer: {
        command: "npm start",
        url: "http://localhost:3000",
        reuseExistingServer: true
    }
});