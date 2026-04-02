const Tenant = require('../models/Tenant');

// @desc    Get Tenant Public Info (Name, Branding, Logo)
// @route   GET /api/tenant/info
// @access  Public (But requires valid subdomain route)
const getTenantInfo = async (req, res) => {
    try {
        // req.tenant is attached by the global tenantMiddleware
        const tenant = await Tenant.findById(req.tenant._id).select('name brandingColors logoUrl isActive fineConfig');

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        if (!tenant.isActive) {
            return res.status(403).json({ message: 'This institution account is currently suspended.' });
        }

        res.json(tenant);
    } catch (error) {
        console.error("Error fetching tenant info:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update Tenant Configuration (Librarian restricted)
// @route   PUT /api/tenant/config
// @access  Private/Librarian
const updateTenantConfig = async (req, res) => {
    try {
        const { fineConfig } = req.body;
        
        let tenant = await Tenant.findById(req.tenant._id);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        
        if (fineConfig) {
            if (fineConfig.currency) tenant.fineConfig.currency = fineConfig.currency;
            if (fineConfig.finePerDay !== undefined) tenant.fineConfig.finePerDay = fineConfig.finePerDay;
        }
        
        await tenant.save();
        res.json({ message: 'Configuration Updated Successfully', fineConfig: tenant.fineConfig });
    } catch (error) {
        console.error("Error updating tenant config:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getTenantInfo,
    updateTenantConfig
};
