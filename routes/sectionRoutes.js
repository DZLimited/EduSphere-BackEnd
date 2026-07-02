const express = require('express');
const router = express.Router();
const {
  getSectionsByCourse,
  createSection,
  updateSection,
  deleteSection,
} = require('../controllers/sectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/course/:courseId', getSectionsByCourse);
router.post('/', protect, authorize('teacher'), createSection);
router.put('/:id', protect, authorize('teacher', 'admin'), updateSection);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteSection);

module.exports = router;