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
        // User Groups table
        db.run(`CREATE TABLE IF NOT EXISTS user_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            parent_id INTEGER,
            FOREIGN KEY(parent_id) REFERENCES user_groups(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error("Error creating user_groups table", err);
        });

        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user',
            position TEXT DEFAULT 'Staff',
            group_id INTEGER,
            FOREIGN KEY(group_id) REFERENCES user_groups(id)
        )`, (err) => {
            if (err) console.error("Error creating users table", err);
            else {
                // Migration: Ensure columns exist
                const columns = [
                    "ALTER TABLE users ADD COLUMN position TEXT DEFAULT 'Staff'",
                    "ALTER TABLE users ADD COLUMN group_id INTEGER"
                ];

                columns.forEach(col => {
                    db.run(col, (err) => {
                        // Ignore error if column already exists
                        if (!err && col.includes('group_id')) {
                            // If we just added group_id, maybe create a default 'General' group?
                            // Let's skip auto-creation for now to keep it simple.
                        }
                    });
                });

                // Create default admin if not exists
                const adminUser = 'admin';
                const adminPass = 'admin123';
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync(adminPass, salt);

                db.run(`INSERT OR IGNORE INTO users (username, password, role, position) VALUES (?, ?, ?, ?)`,
                    [adminUser, hash, 'admin', 'Director']);
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
            is_folder BOOLEAN DEFAULT 0,
            parent_id INTEGER,
            access_level INTEGER DEFAULT 1,
            whitelist TEXT,
            blacklist TEXT,
            FOREIGN KEY(owner_id) REFERENCES users(id),
            FOREIGN KEY(parent_id) REFERENCES files(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error("Error creating files table", err);
            else {
                // Attempt to add columns if they don't exist (for migration)
                const columns = [
                    'ALTER TABLE files ADD COLUMN is_folder BOOLEAN DEFAULT 0',
                    'ALTER TABLE files ADD COLUMN parent_id INTEGER',
                    'ALTER TABLE files ADD COLUMN access_level INTEGER DEFAULT 1',
                    'ALTER TABLE files ADD COLUMN whitelist TEXT',
                    'ALTER TABLE files ADD COLUMN blacklist TEXT'
                ];

                columns.forEach(col => {
                    db.run(col, (err) => {
                        // Ignore error if column already exists
                    });
                });
            }
        });
    });
}

module.exports = db;
