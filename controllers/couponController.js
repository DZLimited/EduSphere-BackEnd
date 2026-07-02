const asyncHandler = require('../middleware/asyncHandler');
const Coupon = require('../models/Coupon');

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

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    res.status(404);
    throw new Error('Invalid coupon code');
  }
  if (!coupon.isActive) {
    res.status(400);
    throw new Error('This coupon is no longer active');
  }
  if (coupon.expiresAt < new Date()) {
    res.status(400);
    throw new Error('This coupon has expired');
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    res.status(400);
    throw new Error('This coupon has reached its usage limit');
  }

  // If applicableCourses is empty, it applies to everything; otherwise every
  // course in the cart must be in the allowed list.
  if (coupon.applicableCourses.length > 0) {
    const allApplicable = courseIds.every((id) =>
      coupon.applicableCourses.some((c) => c.toString() === id)
    );
    if (!allApplicable) {
      res.status(400);
      throw new Error('This coupon does not apply to all courses in your cart');
    }
  }

  res.status(200).json({ success: true, data: { discountPercent: coupon.discountPercent, code: coupon.code } });
});

module.exports = { getAllCoupons, createCoupon, toggleCoupon, deleteCoupon, validateCoupon };