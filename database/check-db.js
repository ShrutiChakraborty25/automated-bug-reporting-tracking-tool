const db = require("./db");

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name;
`).all();

console.log("Tables in database:");

for (const table of tables) {
    console.log(`- ${table.name}`);
}

db.close();