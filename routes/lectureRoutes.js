const express = require('express');
const router = express.Router();
const {
  createLecture,
  getLectureById,
  updateLecture,
  deleteLecture,
} = require('../controllers/lectureController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');


router.get('/:id', optionalAuth, getLectureById);
router.post('/', protect, authorize('teacher'), createLecture);
router.put('/:id', protect, authorize('teacher', 'admin'), updateLecture);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteLecture);

module.exports = router;