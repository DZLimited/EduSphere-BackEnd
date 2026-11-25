const asyncHandler = require('../middleware/asyncHandler');
const Lecture = require('../models/Lecture');
const Section = require('../models/Section');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const { assertCourseOwnership } = require('./sectionController');
const { refreshCourseStats, recalculateCourseDuration } = require('../utils/courseStats');

const parseDuration = (value, res) => {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) {
    res.status(400);
    throw new Error('duration must be a non-negative number of seconds');
  }
  return duration;
};

// @desc    Create a lecture under a section
// @route   POST /api/lectures
// @access  Private/Teacher (owner)
const createLecture = asyncHandler(async (req, res) => {
  const { section: sectionId, title, videoUrl, isPreview, resources } = req.body;

  if (!sectionId || !title || !videoUrl || req.body.duration === undefined) {
    res.status(400);
    throw new Error('section, title, videoUrl and duration are required');
  }
  const duration = parseDuration(req.body.duration, res);

  const section = await Section.findById(sectionId);
  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  await assertCourseOwnership(section.course, req.user);

  const count = await Lecture.countDocuments({ section: sectionId });
  const lecture = await Lecture.create({
    section: sectionId,
    course: section.course,
    title,
    videoUrl,
    duration,
    isPreview: isPreview || false,
    resources: resources || [],
    order: count + 1,
  });

  // New lecture = longer course AND a bigger denominator for every enrolled student
  await refreshCourseStats(section.course);

  res.status(201).json({ success: true, data: lecture });
});

// @desc    Get a single lecture (for the video player)
// @route   GET /api/lectures/:id
// @access  Public (if isPreview) / Private (enrolled student, course owner, or admin)
const getLectureById = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  if (lecture.isPreview) {
    return res.status(200).json({ success: true, data: lecture });
  }

  if (!req.user) {
    res.status(403);
    throw new Error('Login required to view this lecture');
  }

  if (req.user.role === 'admin') {
    return res.status(200).json({ success: true, data: lecture });
  }

  const isOwner = await Course.exists({ _id: lecture.course, teacher: req.user._id });
  if (isOwner) {
    return res.status(200).json({ success: true, data: lecture });
  }

  const isEnrolled = await Enrollment.exists({ student: req.user._id, course: lecture.course });
  if (!isEnrolled) {
    res.status(403);
    throw new Error('You must be enrolled to view this lecture');
  }

  res.status(200).json({ success: true, data: lecture });
});

// @desc    Update a lecture
// @route   PUT /api/lectures/:id
// @access  Private/Teacher (owner)
const updateLecture = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  await assertCourseOwnership(lecture.course, req.user);

  if (req.body.duration !== undefined) req.body.duration = parseDuration(req.body.duration, res);

  const allowedFields = ['title', 'videoUrl', 'duration', 'isPreview', 'resources', 'order'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) lecture[field] = req.body[field];
  });

  const durationChanged = lecture.isModified('duration');
  await lecture.save();

  // Previously a duration edit never reached Course.totalDuration
  if (durationChanged) await recalculateCourseDuration(lecture.course);

  res.status(200).json({ success: true, data: lecture });
});

// @desc    Delete a lecture
// @route   DELETE /api/lectures/:id
// @access  Private/Teacher (owner)
const deleteLecture = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  await assertCourseOwnership(lecture.course, req.user);

  await Progress.deleteMany({ lecture: lecture._id });
  await lecture.deleteOne();
  await refreshCourseStats(lecture.course);

  res.status(200).json({ success: true, message: 'Lecture deleted' });
});

module.exports = { createLecture, getLectureById, updateLecture, deleteLecture };
