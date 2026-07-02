const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
    isCompleted: { type: Boolean, default: false },
    lastWatchedSeconds: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

progressSchema.index({ enrollment: 1, lecture: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
