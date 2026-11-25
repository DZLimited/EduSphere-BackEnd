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
    price: { type: Number, required: true, default: 0, min: [0, 'Price cannot be negative'] },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        // `this` is the document on save(); skip the check for query-style updates
        validator: function (v) {
          return v == null || typeof this.price !== 'number' || v < this.price;
        },
        message: 'Discount price must be lower than the regular price',
      },
    },
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
// (slug already gets a unique index from `unique: true` above — a second
// schema.index({ slug: 1 }) here caused Mongoose's "duplicate index" warning)

module.exports = mongoose.model('Course', courseSchema);
