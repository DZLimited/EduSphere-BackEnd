const asyncHandler = require('../middleware/asyncHandler');
const Coupon = require('../models/Coupon');
const { getCouponError } = require('../utils/couponRules');

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort('-_id');
  res.status(200).json({ success: true, count: coupons.length, data: coupons });
});

// @desc    Create a coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountPercent, expiresAt, maxUses, applicableCourses } = req.body;

  if (!code || !discountPercent || !expiresAt) {
    res.status(400);
    throw new Error('code, discountPercent and expiresAt are required');
  }

  const exists = await Coupon.findOne({ code: code.toUpperCase() });
  if (exists) {
    res.status(400);
    throw new Error('A coupon with this code already exists');
  }

  const coupon = await Coupon.create({
    code,
    discountPercent,
    expiresAt,
    maxUses,
    applicableCourses: applicableCourses || [],
  });

  res.status(201).json({ success: true, data: coupon });
});

// @desc    Toggle a coupon active/inactive (soft "delete")
// @route   PUT /api/coupons/:id/toggle
// @access  Private/Admin
const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  res.status(200).json({ success: true, data: coupon });
});

// @desc    Delete a coupon permanently
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }
  await coupon.deleteOne();
  res.status(200).json({ success: true, message: 'Coupon deleted' });
});

// @desc    Validate a coupon code against a set of courses (called from Checkout, before paying)
// @route   POST /api/coupons/validate
// @access  Private/Student
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, courseIds } = req.body;
  if (!code || !courseIds?.length) {
    res.status(400);
    throw new Error('code and courseIds are required');
  }

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  const couponError = getCouponError(coupon, courseIds);
  if (couponError) {
    res.status(couponError.status);
    throw new Error(couponError.message);
  }

  res.status(200).json({ success: true, data: { discountPercent: coupon.discountPercent, code: coupon.code } });
});

module.exports = { getAllCoupons, createCoupon, toggleCoupon, deleteCoupon, validateCoupon };