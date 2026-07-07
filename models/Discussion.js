const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }, // optional — question can be course-wide or lecture-specific
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    answer: { type: String },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

discussionSchema.index({ course: 1 });
discussionSchema.index({ course: 1, answer: 1 }); // fast "unanswered" filtering for the teacher inbox

module.exports = mongoose.model('Discussion', discussionSchema);