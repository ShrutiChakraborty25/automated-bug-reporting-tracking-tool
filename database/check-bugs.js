
const db = require("./db");

const bugs = db.prepare(`
    SELECT
        bugs.id,
        bugs.title,
        bugs.severity,
        bugs.status,
        tests.test_name,
        tests.status AS test_status,
        bugs.screenshot_path
    FROM bugs
    JOIN tests ON bugs.test_id = tests.id
    ORDER BY bugs.id DESC
`).all();

console.log(JSON.stringify(bugs, null, 2));

db.close();
