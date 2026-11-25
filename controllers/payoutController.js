const asyncHandler = require('../middleware/asyncHandler');
const Payout = require('../models/Payout');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');

// Payout statuses an admin can still act on
const OPEN_STATUSES = ['requested', 'processing'];

// @desc    Teacher requests a payout of some/all of their available earnings
// @route   POST /api/payouts
// @access  Private/Teacher
const requestPayout = asyncHandler(async (req, res) => {
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error('A valid amount is required');
  }

  // Reserve the funds atomically: the balance check and the deduction happen in
  // ONE database operation. The old read-check-save version let two simultaneous
  // requests both pass the check and over-draw the balance.
  const teacher = await User.findOneAndUpdate(
    { _id: req.user._id, earnings: { $gte: amount } },
    { $inc: { earnings: -amount } },
    { new: true }
  );

  if (!teacher) {
    res.status(400);
    throw new Error('Requested amount exceeds your available earnings');
  }

  let payout;
  try {
    payout = await Payout.create({ teacher: req.user._id, amount, status: 'requested' });
  } catch (err) {
    // Don't lose the teacher's money if the payout record fails to save
    await User.findByIdAndUpdate(req.user._id, { $inc: { earnings: amount } });
    throw err;
  }

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

// Atomically moves a payout from an open status to `nextStatus`.
// Returns the updated payout, or throws 404/400. Because the status filter is part
// of the update, two admins clicking at once can't both succeed — which matters most
// for reject, where a double-run would refund the teacher twice.
const transitionPayout = async (id, nextStatus, res) => {
  const payout = await Payout.findOneAndUpdate(
    { _id: id, status: { $in: OPEN_STATUSES } },
    { status: nextStatus, processedAt: new Date() },
    { new: true }
  ).populate('teacher', 'name email');

  if (payout) return payout;

  const existing = await Payout.findById(id);
  if (!existing) {
    res.status(404);
    throw new Error('Payout not found');
  }
  res.status(400);
  throw new Error(`Cannot change a payout with status "${existing.status}"`);
};

// @desc    Admin marks a payout as paid
// @route   PUT /api/payouts/:id/approve
// @access  Private/Admin
const approvePayout = asyncHandler(async (req, res) => {
  const payout = await transitionPayout(req.params.id, 'paid', res);

  await createNotification({
    user: payout.teacher._id,
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
  const payout = await transitionPayout(req.params.id, 'rejected', res);

  // Give the reserved earnings back since the payout didn't go through
  await User.findByIdAndUpdate(payout.teacher._id, { $inc: { earnings: payout.amount } });

  await createNotification({
    user: payout.teacher._id,
    type: 'payout',
    message: `Your payout request of $${payout.amount.toFixed(2)} was rejected. Funds have been returned to your balance.`,
    link: '/teacher/earnings',
  });

  res.status(200).json({ success: true, data: payout });
});

module.exports = { requestPayout, getMyPayouts, getAllPayouts, approvePayout, rejectPayout };
