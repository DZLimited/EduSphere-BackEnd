const asyncHandler = require('../middleware/asyncHandler');
const Review = require('../models/Review');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Recalculates and saves a course's avgRating + totalReviews from actual Review docs
const recalculateCourseRating = async (courseId) => {
  const stats = await Review.aggregate([
    { $match: { course: courseId } },
    { $group: { _id: '$course', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
  ]);

  await Course.findByIdAndUpdate(courseId, {
    avgRating: stats[0] ? Math.round(stats[0].avgRating * 10) / 10 : 0, // round to 1 decimal
    totalReviews: stats[0] ? stats[0].totalReviews : 0,
  });
};

// @desc    Get all reviews for a course
// @route   GET /api/reviews/course/:courseId
// @access  Public
const getCourseReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ course: req.params.courseId })
    .populate('student', 'name avatarUrl')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

// @desc    Create a review (must be enrolled, one review per student per course)
// @route   POST /api/reviews
// @access  Private/Student
const createReview = asyncHandler(async (req, res) => {
  const { course: courseId, rating, comment } = req.body;

  if (!courseId || !rating) {
    res.status(400);
    throw new Error('course and rating are required');
  }

  const isEnrolled = await Enrollment.exists({ student: req.user._id, course: courseId });
  if (!isEnrolled) {
    res.status(403);
    throw new Error('You must be enrolled in this course to review it');
  }

  const existing = await Review.findOne({ course: courseId, student: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error('You have already reviewed this course. Use update instead.');
  }

  const review = await Review.create({
    course: courseId,
    student: req.user._id,
    rating,
    comment,
  });

  await recalculateCourseRating(courseId);

  res.status(201).json({ success: true, data: review });
});

// @desc    Update your own review
// @route   PUT /api/reviews/:id
// @access  Private/Student (owner)
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.student.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this review');
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();

  await recalculateCourseRating(review.course);

  res.status(200).json({ success: true, data: review });
});

// @desc    Delete your own review (or admin can delete any)
// @route   DELETE /api/reviews/:id
// @access  Private/Student (owner) or Admin
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }

  const courseId = review.course;
  await review.deleteOne();
  await recalculateCourseRating(courseId);

  res.status(200).json({ success: true, message: 'Review deleted' });
});

module.exports = { getCourseReviews, createReview, updateReview, deleteReview };