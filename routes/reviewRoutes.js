const express = require('express');
const router = express.Router();
const { getCourseReviews, createReview, updateReview, deleteReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/course/:courseId', getCourseReviews);
router.post('/', protect, authorize('student'), createReview);
router.put('/:id', protect, authorize('student'), updateReview);
router.delete('/:id', protect, authorize('student', 'admin'), deleteReview);

module.exports = router;