const express = require('express');
const router = express.Router();
const {
  sendLinkRequest,
  getMyLinkRequests,
  respondToLinkRequest,
  getMyChildren,
  getChildProgress,
} = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/link-requests', protect, authorize('parent'), sendLinkRequest);
router.get('/link-requests', protect, authorize('student'), getMyLinkRequests);
router.put('/link-requests/:id', protect, authorize('student'), respondToLinkRequest);

router.get('/children', protect, authorize('parent'), getMyChildren);
router.get('/children/:childId/progress', protect, authorize('parent'), getChildProgress);

module.exports = router;