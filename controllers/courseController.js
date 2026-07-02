const asyncHandler = require('../middleware/asyncHandler');
const Course = require('../models/Course');
const APIFeatures = require('../utils/apiFeatures');
const Enrollment = require('../models/Enrollment');

const slugify = (text) =>
  text.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

// @desc    Get all published courses (public listing, with search/filter/pagination)
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
  const baseQuery = Course.find({ status: 'published' })
    .populate('teacher', 'name avatarUrl')
    .populate('category', 'name slug');

  const features = new APIFeatures(baseQuery, req.query).search().filter().sort().paginate();
  const courses = await features.query;

  res.status(200).json({ success: true, count: courses.length, data: courses });
});

// @desc    Get single course by id (includes draft/pending if owner or admin)
// @route   GET /api/courses/:id
// @access  Public (published) / Private (owner/admin for draft)
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('teacher', 'name avatarUrl bio')
    .populate('category', 'name slug');

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const isOwner = req.user && course.teacher._id.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role === 'admin';

  if (course.status !== 'published' && !isOwner && !isAdmin) {
    res.status(403);
    throw new Error('This course is not published yet');
  }

  res.status(200).json({ success: true, data: course });
});

// @desc    Get logged-in teacher's own courses (any status)
// @route   GET /api/courses/my-courses
// @access  Private/Teacher
const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id })
    .populate('category', 'name slug')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: courses.length, data: courses });
});

// @desc    Create a new course (starts as draft)
// @route   POST /api/courses
// @access  Private/Teacher
const createCourse = asyncHandler(async (req, res) => {
  const { title, description, thumbnail, category, level, price, whatYouWillLearn, requirements, language } = req.body;

  if (!title || !description || !thumbnail || !category) {
    res.status(400);
    throw new Error('Title, description, thumbnail and category are required');
  }

  // Ensure slug uniqueness — append short random suffix if collision
  let slug = slugify(title);
  const existing = await Course.findOne({ slug });
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-5)}`;
  }

  const course = await Course.create({
    title,
    slug,
    description,
    thumbnail,
    teacher: req.user._id,
    category,
    level,
    price: price || 0,
    whatYouWillLearn: whatYouWillLearn || [],
    requirements: requirements || [],
    language,
    status: 'draft',
  });

  res.status(201).json({ success: true, data: course });
});

// @desc    Update a course (owner only, and only while not published — published edits go through admin re-review in a later phase)
// @route   PUT /api/courses/:id
// @access  Private/Teacher (owner)
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to edit this course');
  }

  const allowedFields = [
    'title', 'description', 'thumbnail', 'category', 'level',
    'price', 'discountPrice', 'whatYouWillLearn', 'requirements', 'language',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) course[field] = req.body[field];
  });

  if (req.body.title) course.slug = slugify(req.body.title);

  await course.save();
  res.status(200).json({ success: true, data: course });
});

// @desc    Submit course for admin review (draft -> pending_review)
// @route   PUT /api/courses/:id/submit
// @access  Private/Teacher (owner)
const submitForReview = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (course.status !== 'draft' && course.status !== 'rejected') {
    res.status(400);
    throw new Error(`Cannot submit a course with status "${course.status}"`);
  }

  course.status = 'pending_review';
  course.rejectionReason = undefined;
  await course.save();

  res.status(200).json({ success: true, data: course });
});

// @desc    Delete a course (owner or admin)
// @route   DELETE /api/courses/:id
// @access  Private/Teacher (owner) or Admin
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this course');
  }

  const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
  if (enrollmentCount > 0) {
    res.status(400);
    throw new Error(`Cannot delete a course with ${enrollmentCount} active enrollment(s). Unpublish it instead.`);
  }

  await course.deleteOne();
  res.status(200).json({ success: true, message: 'Course deleted' });
});
module.exports = {
  getCourses,
  getCourseById,
  getMyCourses,
  createCourse,
  updateCourse,
  submitForReview,
  deleteCourse,
};