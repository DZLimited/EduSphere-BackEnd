const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

// @desc    Get logged-in student's wishlist (populated with course details)
// @route   GET /api/wishlist
// @access  Private/Student
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    select: 'title thumbnail price discountPrice avgRating totalReviews teacher',
    populate: { path: 'teacher', select: 'name' },
  });

  res.status(200).json({ success: true, data: user.wishlist });
});

// @desc    Add a course to wishlist
// @route   POST /api/wishlist/:courseId
// @access  Private/Student
const addToWishlist = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { wishlist: req.params.courseId } });
  res.status(200).json({ success: true, message: 'Added to wishlist' });
});

// @desc    Remove a course from wishlist
// @route   DELETE /api/wishlist/:courseId
// @access  Private/Student
const removeFromWishlist = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: req.params.courseId } });
  res.status(200).json({ success: true, message: 'Removed from wishlist' });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };