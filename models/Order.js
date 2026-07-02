const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        priceAtPurchase: { type: Number },
      },
    ],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    totalAmount: { type: Number, required: true },
    paymentGateway: { type: String, enum: ['stripe', 'razorpay', 'mock'] },
    paymentIntentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
