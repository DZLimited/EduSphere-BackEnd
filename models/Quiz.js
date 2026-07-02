const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    passingScore: { type: Number, default: 70 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
