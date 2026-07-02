const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseById,
  getMyCourses,
  createCourse,
  updateCourse,
  submitForReview,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

// IMPORTANT: '/my-courses' must come BEFORE '/:id' — otherwise Express treats
// "my-courses" as an :id param and it never reaches the right handler.
router.get('/my-courses', protect, authorize('teacher'), getMyCourses);

router.get('/', getCourses);
router.get('/:id', optionalAuth, getCourseById);

router.post('/', protect, authorize('teacher'), createCourse);
router.put('/:id', protect, authorize('teacher', 'admin'), updateCourse);
router.put('/:id/submit', protect, authorize('teacher'), submitForReview);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteCourse);

module.exports = router;