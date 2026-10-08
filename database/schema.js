const db = require("./db");

db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_name TEXT NOT NULL,
        status TEXT NOT NULL,
        executed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bugs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER,
        module_id INTEGER,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open',
        error_message TEXT,
        screenshot_path TEXT,
        created_at TEXT NOT NULL,

        FOREIGN KEY (test_id)
            REFERENCES tests(id),

        FOREIGN KEY (module_id)
            REFERENCES modules(id)
    );
`);

console.log("Database tables created successfully.");

db.close();