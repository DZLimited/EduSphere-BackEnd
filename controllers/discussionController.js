const asyncHandler = require('../middleware/asyncHandler');
const Discussion = require('../models/Discussion');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const createNotification = require('../utils/createNotification');

// @desc    Ask a question on a course (must be enrolled)
// @route   POST /api/discussions
// @access  Private/Student
const askQuestion = asyncHandler(async (req, res) => {
  const { course: courseId, lecture, question } = req.body;
  if (!courseId || !question) {
    res.status(400);
    throw new Error('course and question are required');
  }

  const isEnrolled = await Enrollment.exists({ student: req.user._id, course: courseId });
  if (!isEnrolled) {
    res.status(403);
    throw new Error('You must be enrolled in this course to ask a question');
  }

  const discussion = await Discussion.create({
    course: courseId,
    lecture: lecture || undefined,
    student: req.user._id,
    question,
  });

  const course = await Course.findById(courseId);
  await createNotification({
    user: course.teacher,
    type: 'new_question',
    message: `New question on "${course.title}"`,
    link: '/teacher/qna',
  });

  res.status(201).json({ success: true, data: discussion });
});

// @desc    Get all Q&A for a course (visible to anyone viewing the course page)
// @route   GET /api/discussions/course/:courseId
// @access  Public
const getCourseDiscussions = asyncHandler(async (req, res) => {
  const discussions = await Discussion.find({ course: req.params.courseId })
    .populate('student', 'name avatarUrl')
    .sort('-createdAt');

  res.status(200).json({ success: true, data: discussions });
});

// @desc    Get all questions across every course the logged-in teacher owns
// @route   GET /api/discussions/teacher
// @access  Private/Teacher
const getTeacherDiscussions = asyncHandler(async (req, res) => {
  const myCourses = await Course.find({ teacher: req.user._id }).select('_id');
  const courseIds = myCourses.map((c) => c._id);

  const discussions = await Discussion.find({ course: { $in: courseIds } })
    .populate('student', 'name avatarUrl')
    .populate('course', 'title')
    .populate('lecture', 'title')
    .sort('-createdAt');

  res.status(200).json({ success: true, data: discussions });
});

// @desc    Teacher answers a question
// @route   PUT /api/discussions/:id/answer
// @access  Private/Teacher (must own the course)
const answerQuestion = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  if (!answer) {
    res.status(400);
    throw new Error('answer is required');
  }

  const discussion = await Discussion.findById(req.params.id).populate('course');
  if (!discussion) {
    res.status(404);
    throw new Error('Question not found');
  }

  if (discussion.course.teacher.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to answer this question');
  }

  discussion.answer = answer;
  discussion.answeredAt = new Date();
  await discussion.save();

  await createNotification({
    user: discussion.student,
    type: 'new_question',
    message: `Your question on "${discussion.course.title}" was answered`,
    link: `/student/course-player/${discussion.course._id}`,
  });

  res.status(200).json({ success: true, data: discussion });
});

module.exports = { askQuestion, getCourseDiscussions, getTeacherDiscussions, answerQuestion };