const asyncHandler = require('../middleware/asyncHandler');
const Payout = require('../models/Payout');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');

// @desc    Teacher requests a payout of some/all of their available earnings
// @route   POST /api/payouts
// @access  Private/Teacher
const requestPayout = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('A valid amount is required');
  }

  const teacher = await User.findById(req.user._id);
  if (amount > teacher.earnings) {
    res.status(400);
    throw new Error('Requested amount exceeds your available earnings');
  }

  // Reserve the funds immediately so a teacher can't request the same
  // earnings twice while a payout is still pending review.
  teacher.earnings -= amount;
  await teacher.save();

  const payout = await Payout.create({
    teacher: req.user._id,
    amount,
    status: 'requested',
  });

  res.status(201).json({ success: true, data: payout });
});

// @desc    Get logged-in teacher's payout history
// @route   GET /api/payouts/my
// @access  Private/Teacher
const getMyPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ teacher: req.user._id }).sort('-createdAt');
  res.status(200).json({ success: true, data: payouts });
});

// @desc    Get all payout requests (admin oversight)
// @route   GET /api/payouts
// @access  Private/Admin
const getAllPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find()
    .populate('teacher', 'name email')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: payouts });
});

// @desc    Admin marks a payout as paid
// @route   PUT /api/payouts/:id/approve
// @access  Private/Admin
const approvePayout = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout) {
    res.status(404);
    throw new Error('Payout not found');
  }
  if (payout.status !== 'requested' && payout.status !== 'processing') {
    res.status(400);
    throw new Error(`Cannot approve a payout with status "${payout.status}"`);
  }

  payout.status = 'paid';
  payout.processedAt = new Date();
  await payout.save();

  await createNotification({
    user: payout.teacher,
    type: 'payout',
    message: `Your payout of $${payout.amount.toFixed(2)} has been paid.`,
    link: '/teacher/earnings',
  });

  res.status(200).json({ success: true, data: payout });
});

// @desc    Admin rejects a payout — refunds the reserved amount back to the teacher's balance
// @route   PUT /api/payouts/:id/reject
// @access  Private/Admin
const rejectPayout = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout) {
    res.status(404);
    throw new Error('Payout not found');
  }
  if (payout.status !== 'requested' && payout.status !== 'processing') {
    res.status(400);
    throw new Error(`Cannot reject a payout with status "${payout.status}"`);
  }

  payout.status = 'rejected';
  payout.processedAt = new Date();
  await payout.save();

  // Give the reserved earnings back since the payout didn't go through
  await User.findByIdAndUpdate(payout.teacher, { $inc: { earnings: payout.amount } });

  await createNotification({
    user: payout.teacher,
    type: 'payout',
    message: `Your payout request of $${payout.amount.toFixed(2)} was rejected. Funds have been returned to your balance.`,
    link: '/teacher/earnings',
  });
  
  res.status(200).json({ success: true, data: payout });
});

module.exports = { requestPayout, getMyPayouts, getAllPayouts, approvePayout, rejectPayout };