const jwt = require('jsonwebtoken');
const db = require('./database');

const SECRET_KEY = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.sendStatus(403);

        db.get(`SELECT id, username, role, position FROM users WHERE id = ?`, [decoded.id], (err, user) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            if (!user) return res.sendStatus(401);

            req.user = user;
            next();
        });
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admin only." });
    }
};

module.exports = { authenticateToken, isAdmin, SECRET_KEY };
