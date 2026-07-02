const express = require('express');
const router = express.Router();
const { getMyEnrollments, checkEnrollment } = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/my', protect, authorize('student'), getMyEnrollments);
router.get('/check/:courseId', protect, authorize('student'), checkEnrollment);

module.exports = router;