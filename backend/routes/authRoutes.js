const express = require('express');
const router = express.Router();
const {
    registerUser,
    verifyRegistration,
    loginUser,
    requestLoginOtp,
    verifyLoginOtp,
    getMe,
    forgotPasswordRequest,
    forgotPasswordVerify
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.post('/register', registerUser);
router.post('/register-verify', verifyRegistration);

router.post('/login', loginUser);
router.post('/login-otp-request', requestLoginOtp);
router.post('/login-otp-verify', verifyLoginOtp);

// Forgot Password Flow
router.post('/forgot-password-request', forgotPasswordRequest);
router.post('/forgot-password-verify', forgotPasswordVerify);

// Protected by User JWT
router.get('/me', protect, getMe);

module.exports = router;
