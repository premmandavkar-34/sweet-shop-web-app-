
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "sweet_house.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS sweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Sweet House database ready!");

module.exports = db;
