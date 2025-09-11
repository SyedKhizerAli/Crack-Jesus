require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email: 'admin@crackjesus.com' });
        if (adminExists) {
            console.log('Admin already exists');
            process.exit(0);
        }

        // Create admin with secure password
        const admin = new Admin({
            username: 'admin',
            email: 'admin@crackjesus.com',
            password: 'Admin@123!', // You should change this immediately after first login
            role: 'admin',
            status: 'active'
        });

        await admin.save();
        console.log('Admin created successfully');
        console.log('Please change the password after first login');
        console.log('Email: admin@crackjesus.com');
        console.log('Password: Admin@123!');
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin(); 