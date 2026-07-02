const express = require('express');
const router = express.Router();
const { checkout, getMyOrders } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('student'), checkout);
router.get('/my', protect, authorize('student'), getMyOrders);

module.exports = router;