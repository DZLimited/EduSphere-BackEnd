const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: function () { return !this.googleId; } },
    googleId: { type: String },
    avatarUrl: { type: String, default: '' },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'parent'],
      default: 'student',
    },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    // Teacher-specific
    bio: { type: String },
    payoutDetails: {
      method: { type: String, enum: ['bank', 'paypal', 'stripe'] },
      accountInfo: { type: String },
    },
    earnings: { type: Number, default: 0 },

    // Student-specific
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
