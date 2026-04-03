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
    forgotPasswordVerify
} = require('../controllers/superAdminController');
const { protectSuperAdmin } = require('../middleware/superAdminAuth');

// Public
router.post('/login', login);
router.post('/login-verify', loginVerify);

// Forgot Password Flow
router.post('/forgot-password-request', forgotPasswordRequest);
router.post('/forgot-password-verify', forgotPasswordVerify);

// Protected by SuperAdmin JWT
router.get('/stats', protectSuperAdmin, getGlobalStats);
router.get('/tenants', protectSuperAdmin, getAllTenants);
router.post('/tenants', protectSuperAdmin, createTenant);
router.put('/tenants/:id/toggle', protectSuperAdmin, toggleTenantStatus);
router.delete('/tenants/:id', protectSuperAdmin, deleteTenant);

module.exports = router;
