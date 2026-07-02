const asyncHandler = require('../middleware/asyncHandler');
const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const Course = require('../models/Course');

// Helper — confirms the logged-in user owns the parent course (or is admin)
const assertCourseOwnership = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  if (course.teacher.toString() !== user._id.toString() && user.role !== 'admin') {
    const err = new Error('Not authorized to modify this course');
    err.statusCode = 403;
    throw err;
  }
  return course;
};

// @desc    Get all sections for a course (with their lectures nested)
// @route   GET /api/sections/course/:courseId
// @access  Public (if course published) / Private (owner)
const getSectionsByCourse = asyncHandler(async (req, res) => {
  const sections = await Section.find({ course: req.params.courseId }).sort('order');

  // Attach lectures to each section — small N+1 here, fine at this scale;
  // if curriculum grows huge we'd switch to a single aggregation later.
  const sectionsWithLectures = await Promise.all(
    sections.map(async (section) => {
      const lectures = await Lecture.find({ section: section._id }).sort('order');
      return { ...section.toObject(), lectures };
    })
  );

  res.status(200).json({ success: true, data: sectionsWithLectures });
});

// @desc    Create a section under a course
// @route   POST /api/sections
// @access  Private/Teacher (owner)
const createSection = asyncHandler(async (req, res) => {
  const { course: courseId, title } = req.body;
  if (!courseId || !title) {
    res.status(400);
    throw new Error('course and title are required');
  }

  await assertCourseOwnership(courseId, req.user);

  const count = await Section.countDocuments({ course: courseId });
  const section = await Section.create({ course: courseId, title, order: count + 1 });

  res.status(201).json({ success: true, data: section });
});

// @desc    Update a section (title or reorder)
// @route   PUT /api/sections/:id
// @access  Private/Teacher (owner)
const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  await assertCourseOwnership(section.course, req.user);

  if (req.body.title !== undefined) section.title = req.body.title;
  if (req.body.order !== undefined) section.order = req.body.order;

  await section.save();
  res.status(200).json({ success: true, data: section });
});

// @desc    Delete a section (and its lectures, to avoid orphaned data)
// @route   DELETE /api/sections/:id
// @access  Private/Teacher (owner)
const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  await assertCourseOwnership(section.course, req.user);

  await Lecture.deleteMany({ section: section._id });
  await section.deleteOne();

  res.status(200).json({ success: true, message: 'Section and its lectures deleted' });
});

module.exports = { getSectionsByCourse, createSection, updateSection, deleteSection, assertCourseOwnership };