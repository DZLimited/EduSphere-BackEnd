const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

// @desc    Get all users (optionally filter by role)
// @route   GET /api/users?role=teacher
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;

  const users = await User.find(filter).select('-password').sort('-createdAt');

  res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Block a user (prevents login, per authMiddleware's isBlocked check)
// @route   PUT /api/users/:id/block
// @access  Private/Admin
const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot block an admin account');
  }

  user.isBlocked = true;
  await user.save();

  res.status(200).json({ success: true, data: user });
});

// @desc    Unblock a user
// @route   PUT /api/users/:id/unblock
// @access  Private/Admin
const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isBlocked = false;
  await user.save();

  res.status(200).json({ success: true, data: user });
});

// @desc    Delete a user account
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot delete an admin account');
  }

  await user.deleteOne();
  // NOTE: this doesn't cascade-delete their courses/enrollments/etc.
  // That's an intentional simplification for now — real production apps usually
  // "soft delete" or anonymize instead of hard-deleting, to avoid orphaned references.
  // Flagging this so it's a conscious decision, not an oversight.

  res.status(200).json({ success: true, message: 'User deleted' });
});

module.exports = { getAllUsers, blockUser, unblockUser, deleteUser };