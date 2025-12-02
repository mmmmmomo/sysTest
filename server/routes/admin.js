const express = require('express');
const fs = require('fs');
const db = require('../database');
const { authenticateToken, isAdmin } = require('../authMiddleware');

const router = express.Router();

// List all users (optional group_id filter)
router.get('/users', authenticateToken, isAdmin, (req, res) => {
    let query = `SELECT id, username, role, position, group_id FROM users`;
    let params = [];

    if (req.query.group_id) {
        query += ` WHERE group_id = ?`;
        params.push(req.query.group_id);
    } else {
        // If no group_id specified, maybe show users with NO group? 
        // Or show all? The file system shows root files. 
        // Let's assume root view shows users with NO group.
        query += ` WHERE group_id IS NULL`;
    }

    db.all(query, params, (err, rows) => {
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

// Update user position
router.put('/users/:id/position', authenticateToken, isAdmin, (req, res) => {
    const { position } = req.body;
    const validPositions = ['Staff', 'Manager', 'Director'];
    if (!validPositions.includes(position)) {
        return res.status(400).json({ message: "Invalid position" });
    }

    db.run(`UPDATE users SET position = ? WHERE id = ?`, [position, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Position updated" });
    });
});

// Update user group
router.put('/users/:id/group', authenticateToken, isAdmin, (req, res) => {
    const { group_id } = req.body;
    db.run(`UPDATE users SET group_id = ? WHERE id = ?`, [group_id || null, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "User not found" });
        res.json({ message: "Group updated" });
    });
});

module.exports = router;

