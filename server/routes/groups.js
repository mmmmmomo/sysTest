const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, isAdmin } = require('../authMiddleware');

// Get groups (optional parent_id filter)
router.get('/', authenticateToken, (req, res) => {
    const parentId = req.query.parent_id || null;

    let query = `SELECT * FROM user_groups WHERE parent_id IS NULL`;
    let params = [];

    if (req.query.parent_id) {
        query = `SELECT * FROM user_groups WHERE parent_id = ?`;
        params = [req.query.parent_id];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create group
router.post('/', authenticateToken, isAdmin, (req, res) => {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    db.run(`INSERT INTO user_groups (name, parent_id) VALUES (?, ?)`, [name, parent_id || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Group created", id: this.lastID });
    });
});

// Update group (rename or move)
router.put('/:id', authenticateToken, isAdmin, (req, res) => {
    const { name, parent_id } = req.body;
    const id = req.params.id;

    let updates = [];
    let params = [];

    if (name) {
        updates.push("name = ?");
        params.push(name);
    }
    if (parent_id !== undefined) {
        updates.push("parent_id = ?");
        params.push(parent_id);
    }

    if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });

    params.push(id);

    db.run(`UPDATE user_groups SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Group not found" });
        res.json({ message: "Group updated" });
    });
});

// Delete group
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
    db.run(`UPDATE users SET group_id = NULL WHERE group_id = ?`, [req.params.id], (err) => {
        if (err) console.error("Error unlinking users", err);

        db.run(`DELETE FROM user_groups WHERE id = ?`, [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Group deleted" });
        });
    });
});

module.exports = router;
