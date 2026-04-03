const express = require('express');
const router = express.Router();
const {
    registerUser,
    verifyRegistration,
    loginUser,
    requestLoginOtp,
    verifyLoginOtp,
    getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/register-verify', verifyRegistration);
router.post('/login', loginUser);
router.post('/login-otp-request', requestLoginOtp);
router.post('/login-otp-verify', verifyLoginOtp);
router.get('/me', protect, getMe);

module.exports = router;
