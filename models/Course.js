const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    price: { type: Number, required: true, default: 0 },
    discountPrice: { type: Number },
    whatYouWillLearn: [{ type: String }],
    requirements: [{ type: String }],
    language: { type: String, default: 'English' },

    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'rejected'],
      default: 'draft',
    },
    rejectionReason: { type: String },

    avgRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ teacher: 1 });
courseSchema.index({ slug: 1 });

module.exports = mongoose.model('Course', courseSchema);
