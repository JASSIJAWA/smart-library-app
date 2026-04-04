const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const nodemailer = require('nodemailer');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Helper Email Dispatcher for Auth
const sendOtpEmail = async (email, name, otp, type = 'Verification') => {
    if (!process.env.GOOGLE_SCRIPT_URL) {
        console.warn("Proxy URL missing, bypassing email dispatch.");
        console.log(`\n=============================================`);
        console.log(`🔑 SECURE OTP GENERATED FOR ${email}: [ ${otp} ]`);
        console.log(`=============================================\n`);
        return;
    }
    try {
        console.log(`\n=============================================`);
        console.log(`🔑 SECURE OTP GENERATED FOR ${email}: [ ${otp} ]`);
        console.log(`=============================================\n`);
        
        let subject = type === 'Verification' ? '🔐 Library Account Verification' : '🔐 Library Secure Login Code';
        let htmlBody = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; background: #ffffff;">
                <h2 style="color: #00cc99; margin-top: 0; font-size: 24px;">${type === 'Verification' ? 'Verify Your Registration' : 'Secure Login Request'}</h2>
                <p style="color: #4a5568; font-size: 16px;">Hi <b>${name}</b>,</p>
                <p style="color: #4a5568; font-size: 16px;">Please use the following 6-digit Security Pin to ${type === 'Verification' ? 'complete your registration' : 'log into your account'}:</p>
                <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e293b; margin: 25px 0; border-radius: 8px; border: 1px dashed #cbd5e1;">
                    ${otp}
                </div>
                <p style="color: #718096; font-size: 14px; font-style: italic;">Note: This code expires in 10 minutes. Library personnel will never ask for this code.</p>
            </div>
        `;

        const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                to: email,
                subject: subject,
                html: htmlBody
            })
        });

        const result = await response.json();
        if (result.status === 'error') {
            console.error('[Email Auth] Proxy Error:', result.message);
        } else {
            console.log(`[Email Auth] Proxy dispatched to ${email}`);
        }
    } catch(err) {
        console.error("[Email Auth] Fetch error:", err);
    }
};

// @desc    Register new user (Initiates OTP Sandbox)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address with a domain (e.g. user@example.com)' });
    }

    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long, contain at least one number, one uppercase letter, and one special character (@$!%*?&)' });
    }

    let user = await User.findOne({ email, tenantId: req.tenant._id });

    if (user) {
        // If they already exist but aren't verified, let them try registering again to resend OTP
        if (user.isVerified) {
            return res.status(400).json({ message: 'User already exists and is verified. Please log in.' });
        }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (user) {
        user.name = name;
        user.password = hashedPassword;
        user.role = role || 'Member';
        user.otpAuthCode = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
    } else {
        user = await User.create({
            tenantId: req.tenant._id,
            name,
            email,
            password: hashedPassword,
            role: role || 'Member',
            isVerified: false,
            otpAuthCode: otp,
            otpExpiry: otpExpiry
        });
    }

    // Dispatch Email Asynchronously
    sendOtpEmail(user.email, user.name, otp, 'Verification');

    res.status(200).json({ message: 'OTP Sent successfully. Please verify to complete registration.', email: user.email });
};

// @desc    Verify Registration OTP
// @route   POST /api/auth/register-verify
const verifyRegistration = async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, tenantId: req.tenant._id });
    
    if (!user) return res.status(404).json({ message: 'Registration not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    if (user.otpAuthCode !== otp) return res.status(400).json({ message: 'Invalid OTP code' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ message: 'OTP has expired. Please register again.' });

    user.isVerified = true;
    user.otpAuthCode = null;
    user.otpExpiry = null;
    await user.save();

    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
        logoUrl: req.tenant.logoUrl,
        tenantName: req.tenant.name
    });
};

// @desc    Authenticate a user (Standard Password)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, tenantId: req.tenant._id });

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    if (!user.isVerified) {
        return res.status(403).json({ message: 'Account not verified. Please register again to securely verify your email.' });
    }

    if (await bcrypt.compare(password, user.password)) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            logoUrl: req.tenant.logoUrl,
        tenantName: req.tenant.name
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
};

// @desc    Request Passwordless Login OTP
// @route   POST /api/auth/login-otp-request
const requestLoginOtp = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email, tenantId: req.tenant._id });

    if (!user) return res.status(404).json({ message: 'No account found with this email.' });
    if (!user.isVerified) return res.status(403).json({ message: 'Account is unverified.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpAuthCode = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    sendOtpEmail(user.email, user.name, otp, 'Login');

    res.status(200).json({ message: 'Login code dispatched to your email.' });
};

// @desc    Verify Passwordless Login OTP
// @route   POST /api/auth/login-otp-verify
const verifyLoginOtp = async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, tenantId: req.tenant._id });
    
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (!user.isVerified) return res.status(403).json({ message: 'Account unverified' });
    if (user.otpAuthCode !== otp) return res.status(400).json({ message: 'Invalid or incorrect code' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ message: 'Security code has expired.' });

    user.otpAuthCode = null;
    user.otpExpiry = null;
    await user.save();

    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
        logoUrl: req.tenant.logoUrl,
        tenantName: req.tenant.name
    });
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

// @desc    Request Password Reset via OTP
// @route   POST /api/auth/forgot-password-request
// @access  Public
const forgotPasswordRequest = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email, tenantId: req.tenant._id });
        if (!user) {
            // Silently return 200 for security, simulating success even if bad email
            return res.json({ message: 'If an account exists, a recovery code was dispatched.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otpAuthCode = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        sendOtpEmail(user.email, user.name, otp, 'Password Recovery Matrix');
        res.json({ message: 'If an account exists, a recovery code was dispatched.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server fault during recovery request' });
    }
};

// @desc    Verify OTP and Reset Password
// @route   POST /api/auth/forgot-password-verify
// @access  Public
const forgotPasswordVerify = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: 'Weak Password. Must contain 8+ chars, 1 uppercase, 1 number, and 1 special char.' });
    }

    try {
        const user = await User.findOne({ email, tenantId: req.tenant._id });

        if (!user || user.otpAuthCode !== otp) {
            return res.status(400).json({ message: 'Invalid or Expired Security Matrix.' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ message: 'OTP has decayed and expired.' });
        }

        // Apply new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Destruct OTP state
        user.otpAuthCode = null;
        user.otpExpiry = null;
        
        // Ensure they are verified if they managed to reset via OTP
        user.isVerified = true;
        
        await user.save();

        res.json({ message: 'Password Reset Successful! You may now authenticate.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error analyzing recovery payload.' });
    }
};

// @desc    Get tenant branding details publicly via subdomain
// @route   GET /api/auth/tenant-lookup/:subdomain
// @access  Public
const getTenantLookup = async (req, res) => {
    try {
        const subdomain = req.params.subdomain.toLowerCase().trim();
        const tenant = await Tenant.findOne({ subdomain, isActive: true });
        
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found or inactive.' });
        }
        res.json({ name: tenant.name, logoUrl: tenant.logoUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server fault mapping tenant code.' });
    }
};

module.exports = {
    registerUser,
    verifyRegistration,
    loginUser,
    requestLoginOtp,
    verifyLoginOtp,
    getMe,
    forgotPasswordRequest,
    forgotPasswordVerify,
    getTenantLookup
};
