const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'file_system.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user'
        )`, (err) => {
            if (err) console.error("Error creating users table", err);
            else {
                // Create default admin if not exists
                const adminUser = 'admin';
                const adminPass = 'admin123';
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync(adminPass, salt);
                
                db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, 
                    [adminUser, hash, 'admin']);
            }
        });

        // Files table
        db.run(`CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            path TEXT,
            size INTEGER,
            mimetype TEXT,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            owner_id INTEGER,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error("Error creating files table", err);
        });
    });
}

module.exports = db;
