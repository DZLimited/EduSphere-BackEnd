const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');

// Protect routes — verifies JWT and attaches user to req
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  // Only the JWT verification itself is wrapped — previously the try/catch also
  // swallowed the "user not found" / "account blocked" errors below and replaced
  // them with a generic 401, so blocked users never saw why they were rejected.
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  req.user = await User.findById(decoded.id).select('-password');

  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  if (req.user.isBlocked) {
    res.status(403);
    throw new Error('Your account has been blocked. Contact support.');
  }

  next();
});

// Role-based access — usage: authorize('admin', 'teacher')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not authorized to access this resource`);
    }
    next();
  };
};

// Attaches req.user if a valid token is present, but doesn't reject if missing.
// Needed for routes that behave differently for logged-in vs anonymous users
// (e.g. public course preview vs. owner draft preview).
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};
module.exports = { protect, authorize, optionalAuth };
