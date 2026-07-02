const express = require('express');
const router = express.Router();
const {
  getAllCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
  validateCoupon,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/validate', protect, authorize('student'), validateCoupon);

router.use(protect, authorize('admin'));
router.get('/', getAllCoupons);
router.post('/', createCoupon);
router.put('/:id/toggle', toggleCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;