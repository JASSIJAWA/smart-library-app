const SuperAdmin = require('../models/SuperAdmin');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Book = require('../models/Book');
const Request = require('../models/Request');
const Category = require('../models/Category');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Auth SuperAdmin & get token
// @route   POST /api/superadmin/login
// @access  Public
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await SuperAdmin.findOne({ email });

        if (admin && (await admin.matchPassword(password))) {
            if (!admin.isActive) {
                return res.status(401).json({ message: 'Account deactivated' });
            }

            res.json({
                _id: admin._id,
                email: admin.email,
                token: generateToken(admin._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get Global Platform Stats
// @route   GET /api/superadmin/stats
// @access  Private (SuperAdmin)
const getGlobalStats = async (req, res) => {
    try {
        const totalTenants = await Tenant.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalBooks = await Book.countDocuments();

        // Calculate active vs inactive tenants
        const activeTenants = await Tenant.countDocuments({ isActive: true });

        res.json({
            totalTenants,
            activeTenants,
            totalUsers,
            totalBooks
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching global stats' });
    }
};

// @desc    Get all Tenants
// @route   GET /api/superadmin/tenants
// @access  Private (SuperAdmin)
const getAllTenants = async (req, res) => {
    try {
        // Find all tenants, sorted by newest first
        const tenants = await Tenant.find().sort({ createdAt: -1 });

        // We might want to attach total users and total books to each tenant for the dashboard
        const enrichedTenants = await Promise.all(tenants.map(async (tenant) => {
            const userCount = await User.countDocuments({ tenantId: tenant._id });
            const bookCount = await Book.countDocuments({ tenantId: tenant._id });
            return {
                ...tenant._doc,
                stats: {
                    users: userCount,
                    books: bookCount
                }
            };
        }));

        res.json(enrichedTenants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching tenants' });
    }
};

// @desc    Provision a new Tenant and its first Librarian
// @route   POST /api/superadmin/tenants
// @access  Private (SuperAdmin)
const createTenant = async (req, res) => {
    const { name, subdomain, adminEmail, adminName, adminPassword, primaryColor } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!emailRegex.test(adminEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address with a domain (e.g. user@example.com)' });
    }

    if (!passwordRegex.test(adminPassword)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long, contain at least one number, one uppercase letter, and one special character (@$!%*?&)' });
    }

    try {
        // 1. Check if subdomain already exists
        const tenantExists = await Tenant.findOne({ subdomain });
        if (tenantExists) {
            return res.status(400).json({ message: 'Subdomain already in use' });
        }

        // 2. Create the Tenant
        const tenant = await Tenant.create({
            name,
            subdomain,
            adminEmail,
            brandingColors: {
                primary: primaryColor || '#2563eb'
            },
            isActive: true
        });

        // 3. Create the first User (Librarian) directly attached to this new Tenant
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const user = await User.create({
            tenantId: tenant._id,
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'Librarian' // Explicitly make them a Librarian
        });

        res.status(201).json({
            message: 'Library Provisioned Successfully',
            tenant,
            adminUser: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error provisioning new tenant' });
    }
};

// @desc    Toggle Tenant Active Status
// @route   PUT /api/superadmin/tenants/:id/toggle
// @access  Private (SuperAdmin)
const toggleTenantStatus = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        tenant.isActive = !tenant.isActive;
        await tenant.save();

        res.json({ message: `Tenant status updated to ${tenant.isActive ? 'Active' : 'Suspended'}`, tenant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating tenant status' });
    }
};

// @desc    Delete a Tenant and all associated data
// @route   DELETE /api/superadmin/tenants/:id
// @access  Private (SuperAdmin)
const deleteTenant = async (req, res) => {
    try {
        const tenantId = req.params.id;

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        // Perform Cascading Deletion
        await User.deleteMany({ tenantId });
        await Book.deleteMany({ tenantId });
        await Request.deleteMany({ tenantId });
        await Category.deleteMany({ tenantId });

        // Finally delete the tenant record
        await Tenant.findByIdAndDelete(tenantId);

        res.json({ message: `Tenant '${tenant.name}' and all associated data have been permanently deleted.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting tenant' });
    }
};

module.exports = {
    login,
    getGlobalStats,
    getAllTenants,
    createTenant,
    toggleTenantStatus,
    deleteTenant
};
