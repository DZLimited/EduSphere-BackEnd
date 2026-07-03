const asyncHandler = require('../middleware/asyncHandler');
const Course = require('../models/Course');
const createNotification = require('../utils/createNotification');

// @desc    Get all courses pending reviews
// @route   GET /api/admin/courses/pending
// @access  Private/Admin
const getPendingCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ status: 'pending_review' })
    .populate('teacher', 'name email')
    .populate('category', 'name')
    .sort('-updatedAt');

  res.status(200).json({ success: true, count: courses.length, data: courses });
});

// @desc    Get ALL courses regardless of status (admin oversight view)
// @route   GET /api/admin/courses
// @access  Private/Admin
const getAllCoursesAdmin = asyncHandler(async (req, res) => {
  const courses = await Course.find()
    .populate('teacher', 'name email')
    .populate('category', 'name')
    .sort('-updatedAt');

  res.status(200).json({ success: true, count: courses.length, data: courses });
});

// @desc    Approve a pending course -> published
// @route   PUT /api/admin/courses/:id/approve
// @access  Private/Admin
const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.status !== 'pending_review') {
    res.status(400);
    throw new Error(`Cannot approve a course with status "${course.status}"`);
  }

  course.status = 'published';
  course.rejectionReason = undefined;
  await course.save();

  await createNotification({
    user: course.teacher,
    type: 'course_approved',
    message: `Your course "${course.title}" has been approved and is now live!`,
    link: `/teacher/my-courses`,
  });

  res.status(200).json({ success: true, data: course });
});

// @desc    Reject a pending course, with a reason -> rejected
// @route   PUT /api/admin/courses/:id/reject
// @access  Private/Admin
const rejectCourse = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    res.status(400);
    throw new Error('A rejection reason is required');
  }

  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.status !== 'pending_review') {
    res.status(400);
    throw new Error(`Cannot reject a course with status "${course.status}"`);
  }

  course.status = 'rejected';
  course.rejectionReason = reason;
  await course.save();

 await createNotification({
    user: course.teacher,
    type: 'course_rejected',
    message: `Your course "${course.title}" was rejected. Reason: ${reason}`,
    link: `/teacher/my-courses`,
  });
  
  res.status(200).json({ success: true, data: course });
});

// @desc    Unpublish a live course (admin override — e.g. policy violation found later)
// @route   PUT /api/admin/courses/:id/unpublish
// @access  Private/Admin
const unpublishCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.status !== 'published') {
    res.status(400);
    throw new Error('Only published courses can be unpublished');
  }

  course.status = 'rejected';
  course.rejectionReason = req.body.reason || 'Unpublished by admin';
  await course.save();

  res.status(200).json({ success: true, data: course });
});

module.exports = {
  getPendingCourses,
  getAllCoursesAdmin,
  approveCourse,
  rejectCourse,
  unpublishCourse,
};