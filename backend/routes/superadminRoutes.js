const express = require('express');
const router = express.Router();
const {
    login,
    getGlobalStats,
    getAllTenants,
    createTenant,
    toggleTenantStatus,
    deleteTenant
} = require('../controllers/superAdminController');
const { protectSuperAdmin } = require('../middleware/superAdminAuth');

// Public
router.post('/login', login);

// Protected by SuperAdmin JWT
router.get('/stats', protectSuperAdmin, getGlobalStats);
router.get('/tenants', protectSuperAdmin, getAllTenants);
router.post('/tenants', protectSuperAdmin, createTenant);
router.put('/tenants/:id/toggle', protectSuperAdmin, toggleTenantStatus);
router.delete('/tenants/:id', protectSuperAdmin, deleteTenant);

module.exports = router;
