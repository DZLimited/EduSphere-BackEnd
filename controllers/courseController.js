const asyncHandler = require('../middleware/asyncHandler');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Review = require('../models/Review');
const Discussion = require('../models/Discussion');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');
const { uniqueSlug } = require('../utils/slugify');

const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'];

// @desc    Get all published courses (public listing, with search/filter/pagination)
// @route   GET /api/courses?keyword=&category=&level=&price[lte]=&sort=-avgRating&page=1&limit=12
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
  const features = new APIFeatures(Course.find({ status: 'published' }), req.query, {
    filterFields: {
      category: 'objectId',
      teacher: 'objectId',
      level: COURSE_LEVELS,
      language: 'string',
      price: 'number',
      avgRating: 'number',
    },
    sortFields: ['createdAt', 'price', 'avgRating', 'totalStudents', 'title'],
  })
    .search()
    .filter()
    .sort()
    .paginate();

  // Read the filter before executing, so the total count matches the same conditions
  const filter = features.query.getFilter();
  const [courses, total] = await Promise.all([
    features.query.populate('teacher', 'name avatarUrl').populate('category', 'name slug'),
    Course.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: courses.length,
    total,
    page: features.page,
    pages: Math.ceil(total / features.limit),
    data: courses,
  });
});

// @desc    Get single course by id
// @route   GET /api/courses/:id
// @access  Public (published) / owner, admin or enrolled student (any status)
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('teacher', 'name avatarUrl bio')
    .populate('category', 'name slug');

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.status !== 'published') {
    const isOwner = req.user && course.teacher._id.toString() === req.user._id.toString();
    const isAdmin = req.user?.role === 'admin';
    // Students who already bought the course keep access while it's being re-reviewed
    const isEnrolled = req.user && !isOwner && !isAdmin
      ? await Enrollment.exists({ student: req.user._id, course: course._id })
      : false;

    if (!isOwner && !isAdmin && !isEnrolled) {
      res.status(403);
      throw new Error('This course is not published yet');
    }
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

  const course = await Course.create({
    title,
    slug: await uniqueSlug(Course, title),
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

// @desc    Update a course
//          A TEACHER editing a PUBLISHED course sends it back to pending_review, so
//          live content can't change without an admin seeing it. Admin edits never
//          change status. Enrolled students keep access during re-review.
// @route   PUT /api/courses/:id
// @access  Private/Teacher (owner) or Admin
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const isAdmin = req.user.role === 'admin';
  if (course.teacher.toString() !== req.user._id.toString() && !isAdmin) {
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

  // The schema validator only fires when discountPrice itself changes, so also
  // catch the case where the regular price is lowered beneath an existing discount.
  if (course.discountPrice != null && course.discountPrice >= course.price) {
    res.status(400);
    throw new Error('Discount price must be lower than the regular price');
  }

  // Only regenerate the slug when the title actually changed, and keep it unique
  // (the old code re-slugified on every save without a collision check -> duplicate-key 500s)
  if (course.isModified('title')) {
    course.slug = await uniqueSlug(Course, course.title, course._id);
  }

  let sentBackToReview = false;
  if (!isAdmin && course.status === 'published' && course.isModified()) {
    course.status = 'pending_review';
    sentBackToReview = true;
  }

  await course.save();
  res.status(200).json({
    success: true,
    data: course,
    ...(sentBackToReview && { message: 'Changes saved. The course is back in review until an admin re-approves it.' }),
  });
});

// @desc    Submit course for admin review (draft/rejected -> pending_review)
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

// @desc    Delete a course (owner or admin) and everything that belongs to it
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

  // Enrollments block deletion (students paid for it), so there is no
  // Progress / Enrollment / Order data to clean up below.
  const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
  if (enrollmentCount > 0) {
    res.status(400);
    throw new Error(`Cannot delete a course with ${enrollmentCount} active enrollment(s). Unpublish it instead.`);
  }

  // Cascade — previously only the Course doc was removed, orphaning its curriculum.
  const quizIds = await Quiz.find({ course: course._id }).distinct('_id');
  const couponIds = await Coupon.find({ applicableCourses: course._id }).distinct('_id');

  await Promise.all([
    Section.deleteMany({ course: course._id }),
    Lecture.deleteMany({ course: course._id }),
    Question.deleteMany({ quiz: { $in: quizIds } }),
    Quiz.deleteMany({ course: course._id }),
    Review.deleteMany({ course: course._id }),
    Discussion.deleteMany({ course: course._id }),
    User.updateMany({ wishlist: course._id }, { $pull: { wishlist: course._id } }),
    Coupon.updateMany({ _id: { $in: couponIds } }, { $pull: { applicableCourses: course._id } }),
  ]);

  // A coupon restricted ONLY to this course now has an empty list — and empty means
  // "applies to everything". Deactivate those instead of silently widening them.
  if (couponIds.length) {
    await Coupon.updateMany(
      { _id: { $in: couponIds }, applicableCourses: { $size: 0 } },
      { isActive: false }
    );
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
