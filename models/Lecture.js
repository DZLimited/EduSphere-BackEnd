const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    duration: { type: Number, required: true },
    resources: [{ name: String, fileUrl: String }],
    isPreview: { type: Boolean, default: false },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

lectureSchema.index({ section: 1, order: 1 });
lectureSchema.index({ course: 1 });

module.exports = mongoose.model('Lecture', lectureSchema);
