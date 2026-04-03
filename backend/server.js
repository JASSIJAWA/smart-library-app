const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize Express app
const app = express();

const server = http.createServer(app);

// Initialize Socket.io Server
const io = new Server(server, {
    cors: {
        origin: "*", // allow frontend access
        methods: ["GET", "POST", "PUT"]
    }
});

// Export io so controllers can broadcast events
module.exports.io = io;

io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
    });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection
connectDB();

// --- Global Super Admin Router ---
// Must be mounted BEFORE attachTenant to bypass tenant-isolation sandboxing
app.use('/api/superadmin', require('./routes/superadminRoutes'));

// Temporary Cloud Shell Bypass for Live Migration Validation
app.get('/api/migrate-users', async (req, res) => {
    try {
        const User = require('./models/User');
        const count = await User.updateMany({}, { isVerified: true, otpAuthCode: null, otpExpiry: null });
        res.send('<h1>MIGRATION SUCCESSFUL!</h1><p>I have forcefully verified ' + count.modifiedCount + ' users directly inside MongoDB Atlas Cloud.</p>');
    } catch (err) {
        res.status(500).send('Error migrating database: ' + err.message);
    }
});

// Temporary Cloud Shell Bypass for Seeding Database natively via HTTPS
app.get('/api/seed-master', async (req, res) => {
    try {
        const SuperAdmin = require('./models/SuperAdmin');
        const adminExists = await SuperAdmin.findOne({ email: 'admin@smartlibrary.com' });
        if (adminExists) {
            return res.send('<h1>Super Admin already exists!</h1><p>Proceed to <a href="/login-superadmin.html">Login</a> with admin@smartlibrary.com and password123</p>');
        }
        await SuperAdmin.create({
            email: 'admin@smartlibrary.com',
            password: 'password123',
            isActive: true
        });
        res.send('<h1>SUCCESS! MASTER SUPER ADMIN CREATED</h1><p>Email: <b>admin@smartlibrary.com</b></p><p>Password: <b>password123</b></p><br><p>Proceed to <a href="/login-superadmin.html">Login</a>.</p>');
    } catch (err) {
        res.status(500).send('Error seeding database: ' + err.message);
    }
});

// --- SaaS Multi-Tenancy Router ---
const { attachTenant } = require('./middleware/tenantMiddleware');
app.use('/api', attachTenant);

// Routes
app.use('/api/tenant', require('./routes/tenantRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/fines', require('./routes/fineRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend')));

// Basic Route for API fallback
app.get('/api', (req, res) => {
    res.send('Library Management System API is running...');
});

// Any other route should serve the index.html for SPA (though we use specific HTML files)
app.use((req, res, next) => {
    // Check if the request is an API request that wasn't matched
    if (req.originalUrl.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ message: err.message || 'Server Error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (HTTP + WebSockets)`);
});
