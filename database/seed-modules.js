
const db = require("./db");

const modules = [
    "Login",
    "Dashboard",
    "User Management",
    "Reports"
];

const insertModule = db.prepare(`
    INSERT OR IGNORE INTO modules (name)
    VALUES (?)
`);

const seedModules = db.transaction(() => {
    for (const moduleName of modules) {
        insertModule.run(moduleName);
    }
});

seedModules();

console.log("Application modules added successfully.");

console.log(
    db.prepare("SELECT * FROM modules ORDER BY id").all()
);

db.close();
