const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { SECRET_KEY, authenticateToken } = require('../authMiddleware');

const router = express.Router();

router.post('/register', (req, res) => {
    const { username, password, position } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }

    const validPositions = ['Staff', 'Manager', 'Director'];
    const userPosition = validPositions.includes(position) ? position : 'Staff';

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    db.run(`INSERT INTO users (username, password, position) VALUES (?, ?, ?)`, [username, hash, userPosition], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: "Username already exists" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "User registered successfully", userId: this.lastID });
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(400).json({ message: "User not found" });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            console.log(`Invalid password for user: ${username}`);
            return res.status(400).json({ message: "Invalid password" });
        }

        console.log(`Login successful for user: ${username}`);
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, position: user.position || 'Staff' }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, position: user.position || 'Staff' } });
    });
});

// Get list of users (id, username, position, group_id) for selection
router.get('/users/list', authenticateToken, (req, res) => {
    db.all(`SELECT id, username, position, group_id FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;

