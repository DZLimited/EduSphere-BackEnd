const asyncHandler = require("../middleware/asyncHandler");

// TODO: Phase 4 -- implement Quiz module business logic
// Pattern to follow: see controllers/authController.js

// @desc    Get all quizs
// @route   GET /api/quizs
// @access  Public/Private (set per endpoint)
const getAllQuizs = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: "Quiz module - to be implemented in Phase 4" });
});

module.exports = { getAllQuizs };
