const Tenant = require('../models/Tenant');

const attachTenant = async (req, res, next) => {
    // 1. Determine the subdomain
    // In local development, it's easier to use a custom Header. 
    // In production, we extract it directly from the hostname.
    let subdomain = 'default';

    if (req.headers['x-tenant-subdomain']) {
        subdomain = req.headers['x-tenant-subdomain'].toLowerCase();
    } else if (req.hostname) {
        const parts = req.hostname.split('.');
        // E.g., harvard.smartlibrary.com -> parts = ['harvard', 'smartlibrary', 'com']
        if (parts.length >= 3 && parts[0] !== 'www') {
            subdomain = parts[0].toLowerCase();
        }
    }

    try {
        const tenant = await Tenant.findOne({ subdomain, isActive: true });

        if (!tenant) {
            return res.status(404).json({ message: `Library institution '${subdomain}' not found or deactivated.` });
        }

        // Attach the found Tenant to the request so succeeding controllers can securely isolate data
        req.tenant = tenant;
        next();
    } catch (error) {
        console.error("Tenant Middleware Error:", error);
        res.status(500).json({ message: 'Internal server error resolving tenant context.' });
    }
};

module.exports = { attachTenant };
