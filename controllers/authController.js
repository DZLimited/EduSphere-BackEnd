const asyncHandler = require('../middleware/asyncHandler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Roles a visitor may pick for themselves at sign-up.
// 'admin' is deliberately excluded — admins are created via the seed script
// or promoted directly in the database, never through the public API.
const SELF_REGISTER_ROLES = ['student', 'teacher', 'parent'];
const MIN_PASSWORD_LENGTH = 6;

// Shape returned by both register and login. Includes the fields the
// frontend dashboards read (e.g. teacher `earnings`) so the UI is correct
// right after login, not only after a page refresh.
const buildAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  earnings: user.earnings,
  token: generateToken(user._id),
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  if (String(password).length < MIN_PASSWORD_LENGTH) {
    res.status(400);
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (role !== undefined && !SELF_REGISTER_ROLES.includes(role)) {
    res.status(400);
    throw new Error(`Invalid role. Choose one of: ${SELF_REGISTER_ROLES.join(', ')}`);
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(String(password), salt);

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: role || 'student',
  });

  res.status(201).json({ success: true, data: buildAuthResponse(user) });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });

  // `!user.password` covers Google-only accounts, which have no local password —
  // bcrypt.compare would otherwise throw on an undefined hash and surface as a 500.
  if (!user || !user.password || !(await bcrypt.compare(String(password), user.password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.isBlocked) {
    res.status(403);
    throw new Error('Your account has been blocked. Contact support.');
  }

  res.json({ success: true, data: buildAuthResponse(user) });
});

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = { registerUser, loginUser, getMe };
