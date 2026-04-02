const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SuperAdmin = require('./models/SuperAdmin');
const connectDB = require('./config/db');

dotenv.config();

const seedSuperAdmin = async () => {
    try {
        await connectDB();

        // Check if a super admin already exists
        const adminExists = await SuperAdmin.findOne({ email: 'admin@smartlibrary.com' });

        if (adminExists) {
            console.log('Super Admin account already exists (admin@smartlibrary.com)');
            process.exit(0);
        }

        // Create the master Super Admin
        const superAdmin = await SuperAdmin.create({
            email: 'admin@smartlibrary.com',
            password: 'password123', // Hardcoded master password for testing purposes
            isActive: true
        });

        console.log('✅ MASTER SUPER ADMIN CREATED SUCCESSFULLY');
        console.log('-------------------------------------------');
        console.log(`Email:    ${superAdmin.email}`);
        console.log(`Password: password123`);
        console.log('-------------------------------------------');
        console.log('Use these credentials to log into the global SaaS dashboard.');

        process.exit(0);
    } catch (error) {
        console.error('❌ SEEDING FAILED:');
        console.error(error);
        process.exit(1);
    }
};

seedSuperAdmin();
