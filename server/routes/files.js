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
    const parentId = req.body.parent_id || null;
    const accessLevel = parseInt(req.body.access_level) || 1;

    db.run(`INSERT INTO files (filename, path, size, mimetype, owner_id, parent_id, is_folder, access_level) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [req.file.originalname, filePath, size, mimetype, ownerId, parentId, accessLevel],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "File uploaded", fileId: this.lastID });
        }
    );
});

// Create Folder
router.post('/folder', authenticateToken, (req, res) => {
    const { name, parent_id, access_level } = req.body;
    if (!name) return res.status(400).json({ message: "Folder name required" });

    const level = parseInt(access_level) || 1;

    db.run(`INSERT INTO files (filename, owner_id, parent_id, is_folder, access_level) VALUES (?, ?, ?, 1, ?)`,
        [name, req.user.id, parent_id || null, level],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Folder created", id: this.lastID });
        }
    );
});

// Rename File/Folder
router.put('/:id', authenticateToken, (req, res) => {
    const { name } = req.body;
    const id = req.params.id;

    if (!name) return res.status(400).json({ message: "Name required" });

    db.run(`UPDATE files SET filename = ? WHERE id = ? AND owner_id = ?`,
        [name, id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: "Item not found or access denied" });
            res.json({ message: "Renamed successfully" });
        }
    );
});

// List Files (with pagination, folder support, search, and access level)
router.get('/', authenticateToken, (req, res) => {
    const parentId = req.query.parent_id || null;
    const search = req.query.search || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    // Determine user level
    const userPosition = req.user.position || 'Staff';
    const positionMap = { 'Staff': 1, 'Manager': 2, 'Director': 3 };
    const userLevel = positionMap[userPosition] || 1;

    // Base query: Owner OR (Access Level <= User Level)
    let query = `SELECT files.*, users.username as owner_name FROM files JOIN users ON files.owner_id = users.id WHERE files.access_level <= ?`;
    let params = [userLevel];

    if (search) {
        query += ` AND files.filename LIKE ?`;
        params.push(`%${search}%`);
    } else {
        if (parentId) {
            query += ` AND files.parent_id = ?`;
            params.push(parentId);
        } else {
            query += ` AND files.parent_id IS NULL`;
        }
    }

    query += ` ORDER BY files.is_folder DESC, files.upload_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Count query (same logic)
        let countQuery = `SELECT COUNT(*) as count FROM files WHERE access_level <= ?`;
        let countParams = [userLevel];

        if (search) {
            countQuery += ` AND filename LIKE ?`;
            countParams.push(`%${search}%`);
        } else {
            if (parentId) {
                countQuery += ` AND parent_id = ?`;
                countParams.push(parentId);
            } else {
                countQuery += ` AND parent_id IS NULL`;
            }
        }

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                items: rows,
                total: countResult.count,
                page,
                totalPages: Math.ceil(countResult.count / limit)
            });
        });
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

// Delete File (Recursive)
router.delete('/:id', authenticateToken, (req, res) => {
    const fileId = req.params.id;

    const deleteRecursive = (id, callback) => {
        // Find children
        db.all(`SELECT * FROM files WHERE parent_id = ?`, [id], (err, children) => {
            if (err) return callback(err);

            let completed = 0;
            if (children.length === 0) return deleteItem(id, callback);

            children.forEach(child => {
                deleteRecursive(child.id, (err) => {
                    if (err) return callback(err);
                    completed++;
                    if (completed === children.length) {
                        deleteItem(id, callback);
                    }
                });
            });
        });
    };

    const deleteItem = (id, callback) => {
        db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, file) => {
            if (err) return callback(err);
            if (!file) return callback(null); // Already deleted?

            if (file.owner_id !== req.user.id && req.user.role !== 'admin') {
                return callback(new Error("Access denied"));
            }

            if (!file.is_folder && file.path) {
                fs.unlink(file.path, (err) => {
                    if (err) console.error("Error deleting file from disk", err);
                    db.run(`DELETE FROM files WHERE id = ?`, [id], callback);
                });
            } else {
                db.run(`DELETE FROM files WHERE id = ?`, [id], callback);
            }
        });
    };

    deleteRecursive(fileId, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

module.exports = router;
