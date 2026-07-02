const asyncHandler = require('../middleware/asyncHandler');
const Enrollment = require('../models/Enrollment');

// @desc    Get logged-in student's enrolled courses
// @route   GET /api/enrollments/my
// @access  Private/Student
const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({
      path: 'course',
      select: 'title thumbnail totalDuration level teacher',
      populate: { path: 'teacher', select: 'name' },
    })
    .sort('-createdAt');

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

// @desc    Check if logged-in student is enrolled in a specific course
// @route   GET /api/enrollments/check/:courseId
// @access  Private/Student
const checkEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: req.params.courseId,
  });

  res.status(200).json({ success: true, isEnrolled: !!enrollment, data: enrollment || null });
});

module.exports = { getMyEnrollments, checkEnrollment };