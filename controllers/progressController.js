const asyncHandler = require('../middleware/asyncHandler');
const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Lecture = require('../models/Lecture');

// @desc    Get progress for every lecture in a course (for the course player sidebar)
// @route   GET /api/progress/course/:courseId
// @access  Private/Student (must be enrolled)
const getCourseProgress = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: req.params.courseId,
  });

  if (!enrollment) {
    res.status(403);
    throw new Error('You are not enrolled in this course');
  }

  const progressRecords = await Progress.find({ enrollment: enrollment._id });

  res.status(200).json({
    success: true,
    data: {
      enrollment,
      progress: progressRecords, // [{ lecture, isCompleted, lastWatchedSeconds }]
    },
  });
});

// @desc    Update progress for a single lecture (resume position and/or mark complete)
//          Recalculates the parent enrollment's overall progressPercent every call.
// @route   PUT /api/progress/lecture/:lectureId
// @access  Private/Student (must be enrolled)
const updateLectureProgress = asyncHandler(async (req, res) => {
  const { isCompleted, lastWatchedSeconds } = req.body;

  const lecture = await Lecture.findById(req.params.lectureId);
  if (!lecture) {
    res.status(404);
    throw new Error('Lecture not found');
  }

  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: lecture.course,
  });
  if (!enrollment) {
    res.status(403);
    throw new Error('You are not enrolled in this course');
  }

  // Upsert — one Progress doc per (enrollment, lecture) pair
  let progress = await Progress.findOne({ enrollment: enrollment._id, lecture: lecture._id });
  if (!progress) {
    progress = new Progress({ enrollment: enrollment._id, lecture: lecture._id });
  }

  if (lastWatchedSeconds !== undefined) progress.lastWatchedSeconds = lastWatchedSeconds;
  if (isCompleted !== undefined) {
    progress.isCompleted = isCompleted;
    if (isCompleted) progress.completedAt = new Date();
  }
  await progress.save();

  // Recalculate the enrollment's cached progressPercent (Phase 2 design decision — denormalized for fast reads)
  const totalLectures = await Lecture.countDocuments({ course: lecture.course });
  const completedCount = await Progress.countDocuments({ enrollment: enrollment._id, isCompleted: true });
  const progressPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  enrollment.progressPercent = progressPercent;
  enrollment.isCompleted = progressPercent === 100;
  await enrollment.save();

  res.status(200).json({ success: true, data: { progress, enrollment } });
});

module.exports = { getCourseProgress, updateLectureProgress };