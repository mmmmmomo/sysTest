const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const groupRoutes = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);

// Serve static files (uploaded files? No, secure download only)
// app.use('/uploads', express.static('uploads')); 

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
