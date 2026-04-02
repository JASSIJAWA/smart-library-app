const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Load models
const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Book = require('./models/Book');
const Request = require('./models/Request');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/library_system', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const seedTenant = async () => {
    try {
        console.log('Seeding Default Tenant...');

        // 1. Check if default tenant already exists
        let tenant = await Tenant.findOne({ subdomain: 'default' });

        if (!tenant) {
            // Create the first SaaS library
            tenant = await Tenant.create({
                name: 'Main Campus Library',
                subdomain: 'default',
                adminEmail: 'admin@smartlibrary.com',
                brandingColors: {
                    primary: '#2563eb',
                    secondary: '#1e40af'
                }
            });
            console.log('✅ Created Default Tenant:', tenant._id);
        } else {
            console.log('✅ Default Tenant already exists:', tenant._id);
        }

        // 2. Backfill ALL existing data to belong to this tenant
        console.log('Starting data backfill...');

        const userResult = await User.updateMany(
            { tenantId: { $exists: false } },
            { $set: { tenantId: tenant._id } }
        );
        console.log(`Updated ${userResult.modifiedCount || userResult.nModified || 0} Users.`);

        const bookResult = await Book.updateMany(
            { tenantId: { $exists: false } },
            { $set: { tenantId: tenant._id } }
        );
        console.log(`Updated ${bookResult.modifiedCount || bookResult.nModified || 0} Books.`);

        const requestResult = await Request.updateMany(
            { tenantId: { $exists: false } },
            { $set: { tenantId: tenant._id } }
        );
        console.log(`Updated ${requestResult.modifiedCount || requestResult.nModified || 0} Requests.`);

        const categoryResult = await Category.updateMany(
            { tenantId: { $exists: false } },
            { $set: { tenantId: tenant._id } }
        );
        console.log(`Updated ${categoryResult.modifiedCount || categoryResult.nModified || 0} Categories.`);

        console.log('🎉 Seeding and Backfilling Complete!');
        process.exit();
    } catch (err) {
        console.error('❌ Error during seeding:', err);
        process.exit(1);
    }
};

seedTenant();
