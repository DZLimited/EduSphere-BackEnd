// Keeps the denormalized numbers on Course / Enrollment in sync with the real
// Lecture and Progress documents. They used to be adjusted with ad-hoc $inc calls,
// which drifted whenever a section was deleted or a lecture's duration changed.
// Recomputing from source is slightly more work per write but can't drift.
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

// Course.totalDuration = sum of its lectures' durations (seconds)
const recalculateCourseDuration = async (courseId) => {
  const [result] = await Lecture.aggregate([
    { $match: { course: toObjectId(courseId) } },
    { $group: { _id: null, total: { $sum: '$duration' } } },
  ]);
  await Course.findByIdAndUpdate(courseId, { totalDuration: result ? result.total : 0 });
};

const toPercent = (completed, total) => (total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0);

// Recalculates ONE enrollment's progressPercent. Only completions of lectures that
// still exist count — previously completions of deleted lectures were still counted,
// so a student could end up above 100%.
const recalculateEnrollmentProgress = async (enrollment) => {
  const lectureIds = await Lecture.find({ course: enrollment.course }).distinct('_id');
  const completed = lectureIds.length
    ? await Progress.countDocuments({ enrollment: enrollment._id, isCompleted: true, lecture: { $in: lectureIds } })
    : 0;

  enrollment.progressPercent = toPercent(completed, lectureIds.length);
  enrollment.isCompleted = enrollment.progressPercent === 100;
  await enrollment.save();
  return enrollment;
};

// Recalculates EVERY enrollment of a course — call after lectures are added or removed,
// since that changes the denominator for all students.
const recalculateCourseProgress = async (courseId) => {
  const enrollments = await Enrollment.find({ course: courseId }).select('_id');
  if (enrollments.length === 0) return;

  const lectureIds = await Lecture.find({ course: courseId }).distinct('_id');
  const counts = lectureIds.length
    ? await Progress.aggregate([
        {
          $match: {
            enrollment: { $in: enrollments.map((e) => e._id) },
            lecture: { $in: lectureIds },
            isCompleted: true,
          },
        },
        { $group: { _id: '$enrollment', completed: { $sum: 1 } } },
      ])
    : [];
  const completedByEnrollment = new Map(counts.map((c) => [c._id.toString(), c.completed]));

  await Enrollment.bulkWrite(
    enrollments.map((e) => {
      const percent = toPercent(completedByEnrollment.get(e._id.toString()) || 0, lectureIds.length);
      return {
        updateOne: {
          filter: { _id: e._id },
          update: { progressPercent: percent, isCompleted: percent === 100 },
        },
      };
    })
  );
};

// Convenience: after any curriculum change, refresh both duration and everyone's progress.
const refreshCourseStats = async (courseId) => {
  await recalculateCourseDuration(courseId);
  await recalculateCourseProgress(courseId);
};

module.exports = {
  recalculateCourseDuration,
  recalculateEnrollmentProgress,
  recalculateCourseProgress,
  refreshCourseStats,
};
