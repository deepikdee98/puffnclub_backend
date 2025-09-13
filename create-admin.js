const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./Models/user');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin already exists!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      phone: '+1234567890',
      password: hashedPassword,
      role: 'admin',
      isSuperAdmin: true,
      adminProfile: {
        title: 'Super Administrator',
        department: 'System Administration',
        bio: 'System administrator with full access',
        permissions: {
          canManageProducts: true,
          canManageOrders: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canManageSettings: true,
        },
        isActive: true,
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log(`👤 User ID: ${admin._id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();