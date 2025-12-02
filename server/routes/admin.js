const express = require('express');
const fs = require('fs');
const db = require('../database');
const { authenticateToken, isAdmin } = require('../authMiddleware');

const router = express.Router();

// List all users
router.get('/users', authenticateToken, isAdmin, (req, res) => {
    db.all(`SELECT id, username, role FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Delete user (and their files)
router.delete('/users/:id', authenticateToken, isAdmin, (req, res) => {
    const userId = req.params.id;
    if (userId == req.user.id) return res.status(400).json({ message: "Cannot delete yourself" });

    // Get all files for this user
    db.all(`SELECT path FROM files WHERE owner_id = ?`, [userId], (err, files) => {
        if (err) return res.status(500).json({ error: err.message });

        // Delete physical files
        files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) console.error(`Failed to delete file ${file.path}:`, err);
            });
        });

        // Delete from DB
        db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run(`DELETE FROM files WHERE owner_id = ?`, [userId], (err) => {
                res.json({ message: "User deleted" });
            });
        });
    });
});

module.exports = router;

