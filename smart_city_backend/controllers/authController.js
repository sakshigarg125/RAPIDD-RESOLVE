const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user (citizen)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department } = req.body;
    const name = `${firstName} ${lastName}`;

    // Validate and fallback role
    const userRole = role && ['citizen', 'officer', 'admin'].includes(role) ? role : 'citizen';

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate custom userId depending on role
    let idPrefix = 'CT';
    if (userRole === 'admin') idPrefix = 'ADM';
    if (userRole === 'officer') idPrefix = 'OFF';
    const userId = `${idPrefix}-${Math.floor(Math.random() * 100000)}`;

    // Create user
    const userData = {
      userId,
      name,
      email,
      password: hashedPassword,
      role: userRole
    };
    
    // Add department for officers
    if (userRole === 'officer' && department) {
      userData.department = department;
    }
    
    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        joined: user.joined,
        status: user.status,
        token: generateToken(user.userId, user.role)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email and role
    const user = await User.findOne({ email, role });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.status === 'Blocked') {
        return res.status(403).json({ message: 'Account is blocked. Contact Admin.' });
      }

      res.json({
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        joined: user.joined,
        status: user.status,
        token: generateToken(user.userId, user.role)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};