const SuperAdmin = require('../models/SuperAdmin');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Book = require('../models/Book');
const Request = require('../models/Request');
const Category = require('../models/Category');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Master Notification NodeMailer
const sendMasterOtpEmail = async (email, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("SMTP missing, logging super admin OTP: ", otp);
        return;
    }
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        
        let htmlBody = `
            <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; padding: 30px; border-radius: 4px; background: #000; color: #fff;">
                <h2 style="color: #ef4444; margin-top: 0; font-size: 24px; text-transform: uppercase;">Global Command Center 2FA</h2>
                <p style="font-size: 16px;">A login handshake was initiated for the Master Super Admin console.</p>
                <div style="background-color: #1a1a1a; padding: 25px; text-align: center; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #ef4444; margin: 30px 0; border: 1px dashed #ef4444;">
                    ${otp}
                </div>
                <p style="color: #666; font-size: 12px;">AUTHORIZATION MATRIX EXPIRES IN 10 MINUTES.</p>
            </div>
        `;
        await transporter.sendMail({
            from: `"Command Center Ops" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🚨 URGENT: Secure Command Center Access',
            html: htmlBody
        });
    } catch(err) {
        console.error("Super Admin Mail Error:", err);
    }
};

// @desc    Auth SuperAdmin & GET Master Pin Phase 1
// @route   POST /api/superadmin/login
// @access  Public
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });

        if (admin && (await admin.matchPassword(password))) {
            if (!admin.isActive) {
                return res.status(401).json({ message: 'Account deactivated' });
            }

            // Construct 2FA Master Pin
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            admin.otpAuthCode = otp;
            admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await admin.save();

            sendMasterOtpEmail(admin.email, otp);

            res.status(200).json({ message: 'Master Key Handshake constructed. Secure Transmission sent via SMTP.' });
        } else {
            res.status(401).json({ message: 'Invalid master credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server fault during decryption' });
    }
};

// @desc    Verify SuperAdmin 2FA OTP Phase 2
// @route   POST /api/superadmin/login-verify
// @access  Public
const loginVerify = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
        
        if (!admin) return res.status(404).json({ message: 'Admin layer not found.' });
        if (!admin.isActive) return res.status(403).json({ message: 'Admin layer permanently locked.' });
        
        if (admin.otpAuthCode !== otp) return res.status(400).json({ message: 'Invalid 2FA Authorization Key.' });
        if (new Date() > admin.otpExpiry) return res.status(400).json({ message: 'Authorization Key has decayed and expired.' });

        admin.otpAuthCode = null;
        admin.otpExpiry = null;
        await admin.save();

        res.json({
            _id: admin._id,
            email: admin.email,
            token: generateToken(admin._id),
        });
    } catch (error) {
        res.status(500).json({ message: 'Fault analyzing OTP packet' });
    }
};

// @desc    Request Password Reset via OTP
// @route   POST /api/superadmin/forgot-password-request
// @access  Public
const forgotPasswordRequest = async (req, res) => {
    const { email } = req.body;
    try {
        const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.json({ message: 'If credentials match, a Master Key was dispatched.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        admin.otpAuthCode = otp;
        admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await admin.save();

        sendMasterOtpEmail(admin.email, otp);
        res.json({ message: 'If credentials match, a Master Key was dispatched.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server fault during recovery attempt.' });
    }
};

// @desc    Verify OTP and Reset Password for SuperAdmin
// @route   POST /api/superadmin/forgot-password-verify
// @access  Public
const forgotPasswordVerify = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: 'Weak Master Password. Requires 8+ chars, uppercase, number, special char.' });
    }

    try {
        const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });

        if (!admin || admin.otpAuthCode !== otp) {
            return res.status(400).json({ message: 'Invalid or Expired Master Key.' });
        }

        if (new Date() > admin.otpExpiry) {
            return res.status(400).json({ message: 'Master Key has decayed and expired.' });
        }

        // Apply new raw password. The SuperAdmin schema pre('save') hook will automatically hash this.
        admin.password = newPassword;
        
        admin.otpAuthCode = null;
        admin.otpExpiry = null;
        
        await admin.save();

        res.json({ message: 'Master Password successfully reset. You may now authenticate.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Fault analyzing recovery payload.' });
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
        const tenants = await Tenant.find().sort({ createdAt: -1 });

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
        const tenantExists = await Tenant.findOne({ subdomain });
        if (tenantExists) {
            return res.status(400).json({ message: 'Subdomain already in use' });
        }

        const tenant = await Tenant.create({
            name,
            subdomain,
            adminEmail,
            brandingColors: {
                primary: primaryColor || '#2563eb'
            },
            isActive: true
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const user = await User.create({
            tenantId: tenant._id,
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'Librarian',
            isVerified: true // ORGANICALLY FIX THE PROVISIONING BUG
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
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        await User.deleteMany({ tenantId });
        await Book.deleteMany({ tenantId });
        await Request.deleteMany({ tenantId });
        await Category.deleteMany({ tenantId });

        await Tenant.findByIdAndDelete(tenantId);

        res.json({ message: `Library '${tenant.name}' and all associated cloud data permanently detonated.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error orchestrating global deletion' });
    }
};

module.exports = {
    login,
    loginVerify,
    getGlobalStats,
    getAllTenants,
    createTenant,
    toggleTenantStatus,
    deleteTenant,
    forgotPasswordRequest,
    forgotPasswordVerify
};
