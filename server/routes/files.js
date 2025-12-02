const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authenticateToken } = require('../authMiddleware');

const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Upload File
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { filename, path: filePath, size, mimetype } = req.file;
    const ownerId = req.user.id;

    db.run(`INSERT INTO files (filename, path, size, mimetype, owner_id) VALUES (?, ?, ?, ?, ?)`,
        [req.file.originalname, filePath, size, mimetype, ownerId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "File uploaded", fileId: this.lastID });
        }
    );
});

// List Files
router.get('/', authenticateToken, (req, res) => {
    let query = `SELECT * FROM files WHERE owner_id = ?`;
    let params = [req.user.id];

    if (req.user.role === 'admin') {
        query = `SELECT files.*, users.username as owner_name FROM files JOIN users ON files.owner_id = users.id`;
        params = [];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Download File
router.get('/download/:id', authenticateToken, (req, res) => {
    const fileId = req.params.id;

    // Check permission
    db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, file) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!file) return res.status(404).json({ message: "File not found" });

        if (file.owner_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        res.download(file.path, file.filename);
    });
});

// Preview File
router.get('/preview/:id', authenticateToken, (req, res) => {
    const fileId = req.params.id;

    db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, file) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!file) return res.status(404).json({ message: "File not found" });

        if (file.owner_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
        res.sendFile(file.path);
    });
});

// Delete File
router.delete('/:id', authenticateToken, (req, res) => {
    const fileId = req.params.id;

    db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, file) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!file) return res.status(404).json({ message: "File not found" });

        if (file.owner_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file from disk", err);
            // Delete from DB even if disk delete fails (or maybe not? let's assume yes for consistency)
            db.run(`DELETE FROM files WHERE id = ?`, [fileId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "File deleted" });
            });
        });
    });
});

module.exports = router;
