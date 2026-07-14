const User = require('../models/user');
const bcrypt = require('bcryptjs');

// @desc    Get all users based on query role or userId
// @route   GET /api/users
exports.getUsers = async (req, res) => {
    try {
        const { role, userId } = req.query;
        let query = {};
        if (role) {
            query.role = role;
        }
        if (userId) {
            query.userId = userId;
        }
        const users = await User.find(query).sort('-createdAt');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile & status (Name, Email, Status)
// @route   PATCH /api/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { status, name, email } = req.body;
        const user = await User.findOne({ userId: req.params.id });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (status) user.status = status;
        if (name) user.name = name;
        if (email) user.email = email;

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Seed default officers for each department
// @route   POST /api/users/seed-officers
exports.seedOfficers = async (req, res) => {
    try {
        const departments = [
            'Civil Works (Roads)',
            'Waste Management',
            'Water Supply',
            'Electricity',
            'Health & Sanitation',
            'Traffic Management',
            'Public Safety'
        ];

        const defaultPassword = 'Officer123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        const createdOfficers = [];

        for (const department of departments) {
            // Check if officer already exists for this department
            const existingOfficer = await User.findOne({ 
                role: 'officer', 
                department: department 
            });

            if (!existingOfficer) {
                const userId = `OFF-${Math.floor(Math.random() * 100000)}`;
                const officerName = department.split(' ')[0] + ' Officer';

                const officer = await User.create({
                    userId,
                    name: officerName,
                    email: `${department.toLowerCase().replace(/[^a-z0-9]/g, '')}@smartcity.com`,
                    password: hashedPassword,
                    role: 'officer',
                    department,
                    status: 'Active'
                });

                createdOfficers.push({
                    userId: officer.userId,
                    name: officer.name,
                    email: officer.email,
                    department: officer.department,
                    password: defaultPassword
                });
            }
        }

        if (createdOfficers.length === 0) {
            return res.json({ 
                message: 'All departments already have officers',
                totalOfficers: departments.length
            });
        }

        res.json({
            message: `Created ${createdOfficers.length} default officers`,
            officers: createdOfficers,
            note: 'Default password for all officers: Officer123'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
