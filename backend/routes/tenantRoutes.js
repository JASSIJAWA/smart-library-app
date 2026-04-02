const express = require('express');
const router = express.Router();
const { getTenantInfo, updateTenantConfig } = require('../controllers/tenantController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/info', getTenantInfo);
router.put('/config', protect, checkRole(['Librarian']), updateTenantConfig);

module.exports = router;
