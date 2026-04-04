const express = require('express');
const router = express.Router();
const {
    login,
    loginVerify,
    getGlobalStats,
    getAllTenants,
    createTenant,
    toggleTenantStatus,
    deleteTenant,
    forgotPasswordRequest,
    forgotPasswordVerify,
    updateTenantSettings
} = require('../controllers/superAdminController');
const { protectSuperAdmin } = require('../middleware/superAdminAuth');
const upload = require('../middleware/uploadMiddleware');

// Public
router.post('/login', login);
router.post('/login-verify', loginVerify);

// Forgot Password Flow
router.post('/forgot-password-request', forgotPasswordRequest);
router.post('/forgot-password-verify', forgotPasswordVerify);

// Protected by SuperAdmin JWT
router.get('/stats', protectSuperAdmin, getGlobalStats);
router.get('/tenants', protectSuperAdmin, getAllTenants);
router.post('/tenants', protectSuperAdmin, upload.single('logo'), createTenant);
router.put('/tenants/:id/toggle', protectSuperAdmin, toggleTenantStatus);
router.put('/tenants/:id/settings', protectSuperAdmin, upload.single('logo'), updateTenantSettings);
router.delete('/tenants/:id', protectSuperAdmin, deleteTenant);

module.exports = router;
