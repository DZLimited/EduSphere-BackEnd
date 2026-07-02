const express = require('express');
const router = express.Router();
const { getCourseProgress, updateLectureProgress } = require('../controllers/progressController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/course/:courseId', protect, authorize('student'), getCourseProgress);
router.put('/lecture/:lectureId', protect, authorize('student'), updateLectureProgress);

module.exports = router;