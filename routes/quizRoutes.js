const express = require("express");
const router = express.Router();
const { getAllQuizs } = require("../controllers/quizController");
// const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", getAllQuizs);

module.exports = router;
