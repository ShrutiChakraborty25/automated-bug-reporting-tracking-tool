const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(
    __dirname,
    "bug-tracking.db"
);

const db = new Database(databasePath);

console.log("SQLite database connected.");

module.exports = db;