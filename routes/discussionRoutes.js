const express = require('express');
const router = express.Router();
const {
  askQuestion,
  getCourseDiscussions,
  getTeacherDiscussions,
  answerQuestion,
} = require('../controllers/discussionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Static path before param path — same ordering rule as /my-courses earlier
router.get('/teacher', protect, authorize('teacher'), getTeacherDiscussions);
router.get('/course/:courseId', getCourseDiscussions);

router.post('/', protect, authorize('student'), askQuestion);
router.put('/:id/answer', protect, authorize('teacher'), answerQuestion);

module.exports = router;