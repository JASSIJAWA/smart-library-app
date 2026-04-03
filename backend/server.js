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
connectDB().then(async () => {
    // Dynamic Cloud Seeder - Aggressive Variant
    try {
        const SuperAdmin = require('./models/SuperAdmin');
        
        // Log all existing super admins to terminal for debugging
        const allAdmins = await SuperAdmin.find({}, 'email');
        console.log(`\n=== DATACENTER DIAGNOSTIC ===`);
        console.log(`Current SuperAdmins in Cloud DB: ${allAdmins.map(a => a.email).join(', ') || 'NONE'}`);
        
        // Forcefully ensure smartlib18 exists
        const adminExists = await SuperAdmin.findOne({ email: 'smartlib18@gmail.com' });
        if (!adminExists) {
            const admin = new SuperAdmin({
                email: 'smartlib18@gmail.com',
                password: 'Password123!',
                isActive: true
            });
            await admin.save();
            console.log('Global Master SuperAdmin (smartlib18) auto-seeded into cloud database.');
        } else {
            console.log('smartlib18@gmail.com already exists globally.');
        }
        console.log(`=============================\n`);
    } catch(err) {
        console.error('Auto-seeding bypassed:', err.message);
    }
});

// --- Global Super Admin Router ---
// Must be mounted BEFORE attachTenant to bypass tenant-isolation sandboxing
app.use('/api/superadmin', require('./routes/superadminRoutes'));

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
