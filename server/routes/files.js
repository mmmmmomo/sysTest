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

    // Fix Chinese filename encoding (latin1 -> utf8)
    req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

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

// Rename or Move File/Folder
router.put('/:id', authenticateToken, (req, res) => {
    const { name, parent_id, access_level } = req.body;
    const id = req.params.id;

    if (parent_id && parseInt(parent_id) === parseInt(id)) {
        return res.status(400).json({ message: "Cannot move a folder into itself" });
    }

    // Check for circular dependency
    if (parent_id) {
        const checkCycle = (targetId, sourceId, callback) => {
            if (!targetId) return callback(false); // Root is safe
            if (parseInt(targetId) === parseInt(sourceId)) return callback(true); // Cycle detected

            db.get(`SELECT parent_id FROM files WHERE id = ?`, [targetId], (err, row) => {
                if (err || !row) return callback(false); // Error or not found, assume safe (or handle error)
                checkCycle(row.parent_id, sourceId, callback);
            });
        };

        // We need to wrap this in a promise or use callback structure properly. 
        // Since we are inside the route handler, let's use a Promise wrapper for cleaner async/await if possible, 
        // but here we are in callback hell style. Let's keep it simple.

        // Wait, we can't easily block here without async/await. Let's refactor to use a helper function.
    }

    // ... wait, let's rewrite the route to be async/await for better flow control
    // But for now, let's just insert the logic before the update.

    const performUpdate = () => {
        // Build query dynamically
        let updates = [];
        let params = [];

        if (name) {
            updates.push("filename = ?");
            params.push(name);
        }
        if (parent_id !== undefined) {
            updates.push("parent_id = ?");
            params.push(parent_id);
        }
        if (access_level !== undefined) {
            updates.push("access_level = ?");
            params.push(parseInt(access_level));
        }

        if (updates.length === 0) return res.status(400).json({ message: "Nothing to update" });

        params.push(id);

        let query = `UPDATE files SET ${updates.join(', ')} WHERE id = ?`;

        // If not admin, restrict to owner
        if (req.user.role !== 'admin') {
            query += ` AND owner_id = ?`;
            params.push(req.user.id);
        }

        db.run(query, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: "Item not found or access denied" });
            res.json({ message: "Updated successfully" });
        });
    };

    if (parent_id) {
        const checkCycle = (currentId) => {
            return new Promise((resolve, reject) => {
                db.get(`SELECT parent_id FROM files WHERE id = ?`, [currentId], (err, row) => {
                    if (err) return reject(err);
                    if (!row) return resolve(false); // Should not happen if ID exists
                    if (row.parent_id === null) return resolve(false); // Reached root
                    if (parseInt(row.parent_id) === parseInt(id)) return resolve(true); // Cycle detected
                    resolve(checkCycle(row.parent_id));
                });
            });
        };

        checkCycle(parent_id).then(isCycle => {
            if (isCycle) return res.status(400).json({ message: "Cannot move a folder into its own subfolder" });
            performUpdate();
        }).catch(err => res.status(500).json({ error: err.message }));
    } else {
        performUpdate();
    }
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

    // Base query
    let query = `SELECT files.*, users.username as owner_name FROM files JOIN users ON files.owner_id = users.id WHERE 1=1`;
    let params = [];

    // Access Control: Admin sees all, otherwise check level or ownership
    if (req.user.role !== 'admin') {
        query += ` AND (files.access_level <= ? OR files.owner_id = ?)`;
        params.push(userLevel, req.user.id);
    }

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
        let countQuery = `SELECT COUNT(*) as count FROM files WHERE 1=1`;
        let countParams = [];

        if (req.user.role !== 'admin') {
            countQuery += ` AND (access_level <= ? OR owner_id = ?)`;
            countParams.push(userLevel, req.user.id);
        }

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

        // Determine user level
        const userPosition = req.user.position || 'Staff';
        const positionMap = { 'Staff': 1, 'Manager': 2, 'Director': 3 };
        const userLevel = positionMap[userPosition] || 1;

        // Check: Admin OR Owner OR Access Level
        if (req.user.role !== 'admin' && file.owner_id !== req.user.id && file.access_level > userLevel) {
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

        // Determine user level
        const userPosition = req.user.position || 'Staff';
        const positionMap = { 'Staff': 1, 'Manager': 2, 'Director': 3 };
        const userLevel = positionMap[userPosition] || 1;

        // Check: Admin OR Owner OR Access Level
        if (req.user.role !== 'admin' && file.owner_id !== req.user.id && file.access_level > userLevel) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.setHeader('Content-Type', file.mimetype);
        // Use filename*=UTF-8'' for proper browser support of non-ASCII characters
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
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
