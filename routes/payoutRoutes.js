const express = require('express');
const router = express.Router();
const {
  requestPayout,
  getMyPayouts,
  getAllPayouts,
  approvePayout,
  rejectPayout,
} = require('../controllers/payoutController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('teacher'), requestPayout);
router.get('/my', protect, authorize('teacher'), getMyPayouts);

router.get('/', protect, authorize('admin'), getAllPayouts);
router.put('/:id/approve', protect, authorize('admin'), approvePayout);
router.put('/:id/reject', protect, authorize('admin'), rejectPayout);

module.exports = router;