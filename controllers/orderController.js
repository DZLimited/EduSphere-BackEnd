const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const { getCouponError } = require('../utils/couponRules');

// @desc    Checkout — creates an order and enrolls the student
//          MOCK PAYMENT: marks payment as "success" immediately, no real gateway call.
//          TODO (later phase): replace the paymentStatus/paymentGateway lines below
//          with a real Stripe PaymentIntent flow (see services/paymentService.js stub).
// @route   POST /api/orders
// @access  Private/Student
const checkout = asyncHandler(async (req, res) => {
  const { courseIds, couponCode } = req.body;

  if (!courseIds || courseIds.length === 0) {
    res.status(400);
    throw new Error('No courses provided for checkout');
  }

  const courses = await Course.find({ _id: { $in: courseIds }, status: 'published' });

  if (courses.length !== courseIds.length) {
    res.status(400);
    throw new Error('One or more courses are unavailable or unpublished');
  }

  const existingEnrollments = await Enrollment.find({
    student: req.user._id,
    course: { $in: courseIds },
  });
  if (existingEnrollments.length > 0) {
    res.status(400);
    throw new Error('You are already enrolled in one or more of these courses');
  }

  const orderCourses = courses.map((c) => ({
    course: c._id,
    priceAtPurchase: c.discountPrice ?? c.price,
  }));
  let totalAmount = orderCourses.reduce((sum, c) => sum + c.priceAtPurchase, 0);

  // ---- Coupon handling (re-validates server-side, never trusts a client-computed discount) ----
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
    // Same rules as /api/coupons/validate — including applicableCourses, which
    // this endpoint previously skipped (allowing the coupon on any course via direct API call).
    const couponError = getCouponError(coupon, courseIds);
    if (couponError) {
      res.status(couponError.status === 404 ? 400 : couponError.status);
      throw new Error(couponError.message);
    }
    totalAmount = totalAmount * (1 - coupon.discountPercent / 100);
    totalAmount = Math.round(totalAmount * 100) / 100;
  }
  // ------------------------------------------------------------------------------------------

  // ---- MOCK PAYMENT (replace this block with real Stripe integration later) ----
  const order = await Order.create({
    student: req.user._id,
    courses: orderCourses,
    coupon: coupon?._id,
    totalAmount,
    paymentGateway: 'mock',
    paymentIntentId: `mock_${Date.now()}`,
    paymentStatus: 'success',
  });
  // --------------------------------------------------------------------------

  if (coupon) {
    coupon.usedCount += 1;
    await coupon.save();
  }

  const enrollments = await Promise.all(
    courses.map((course) =>
      Enrollment.create({
        student: req.user._id,
        course: course._id,
        order: order._id,
      })
    )
  );

  await Course.updateMany({ _id: { $in: courseIds } }, { $inc: { totalStudents: 1 } });
// Credit each course's teacher with their share of the sale.
  // SIMPLIFICATION: teacher gets 100% of priceAtPurchase — no platform commission
  // deducted yet. A commission % (e.g. course.price * 0.7) is a one-line change
  // here whenever you're ready to add that business rule.
  for (const item of orderCourses) {
    const course = courses.find((c) => c._id.toString() === item.course.toString());
    await User.findByIdAndUpdate(course.teacher, { $inc: { earnings: item.priceAtPurchase } });
  }
  res.status(201).json({ success: true, data: { order, enrollments } });
});

// @desc    Get logged-in student's order history
// @route   GET /api/orders/my
// @access  Private/Student
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ student: req.user._id })
    .populate('courses.course', 'title thumbnail')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: orders.length, data: orders });
});

module.exports = { checkout, getMyOrders };