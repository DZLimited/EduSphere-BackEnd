const asyncHandler = require('../middleware/asyncHandler');
const ParentChildLink = require('../models/ParentChildLink');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// @desc    Parent sends a link request to a student by email
// @route   POST /api/parents/link-requests
// @access  Private/Parent
const sendLinkRequest = asyncHandler(async (req, res) => {
  const { childEmail } = req.body;
  if (!childEmail) {
    res.status(400);
    throw new Error('childEmail is required');
  }

  const child = await User.findOne({ email: childEmail, role: 'student' });
  if (!child) {
    res.status(404);
    throw new Error('No student account found with that email');
  }

  const existing = await ParentChildLink.findOne({ parent: req.user._id, child: child._id });
  if (existing) {
    res.status(400);
    throw new Error(`A link request already exists with status "${existing.status}"`);
  }

  const link = await ParentChildLink.create({
    parent: req.user._id,
    child: child._id,
    status: 'pending',
  });

  // TODO (Notifications module): notify the student of the incoming request

  res.status(201).json({ success: true, data: link });
});

// @desc    Get pending link requests addressed to the logged-in student
// @route   GET /api/parents/link-requests
// @access  Private/Student
const getMyLinkRequests = asyncHandler(async (req, res) => {
  const requests = await ParentChildLink.find({ child: req.user._id, status: 'pending' })
    .populate('parent', 'name email');

  res.status(200).json({ success: true, data: requests });
});

// @desc    Student approves or rejects a link request
// @route   PUT /api/parents/link-requests/:id
// @access  Private/Student
const respondToLinkRequest = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) {
    res.status(400);
    throw new Error('action must be "approve" or "reject"');
  }

  const link = await ParentChildLink.findById(req.params.id);
  if (!link) {
    res.status(404);
    throw new Error('Link request not found');
  }

  if (link.child.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to respond to this request');
  }

  link.status = action === 'approve' ? 'approved' : 'rejected';
  await link.save();

  res.status(200).json({ success: true, data: link });
});

// @desc    Get the logged-in parent's linked (approved) children
// @route   GET /api/parents/children
// @access  Private/Parent
const getMyChildren = asyncHandler(async (req, res) => {
  const links = await ParentChildLink.find({ parent: req.user._id, status: 'approved' })
    .populate('child', 'name email avatarUrl');

  res.status(200).json({ success: true, data: links });
});

// @desc    Get a specific linked child's course progress (read-only)
// @route   GET /api/parents/children/:childId/progress
// @access  Private/Parent (only if link is approved)
const getChildProgress = asyncHandler(async (req, res) => {
  const link = await ParentChildLink.findOne({
    parent: req.user._id,
    child: req.params.childId,
    status: 'approved',
  });

  if (!link) {
    res.status(403);
    throw new Error('You are not linked to this student, or the link is not yet approved');
  }

  const enrollments = await Enrollment.find({ student: req.params.childId })
    .populate('course', 'title thumbnail totalDuration level')
    .sort('-createdAt');

  res.status(200).json({ success: true, data: enrollments });
});

module.exports = {
  sendLinkRequest,
  getMyLinkRequests,
  respondToLinkRequest,
  getMyChildren,
  getChildProgress,
};