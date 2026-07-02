// Business logic for payment gateways lives here — kept OUT of controllers
// so orderController.js stays thin and payment logic is unit-testable in isolation.
// TODO: Phase 4 — implement Stripe/Razorpay charge creation & webhook verification

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createStripePaymentIntent = async (amount, currency = 'usd') => {
  return stripe.paymentIntents.create({
    amount: amount * 100, // Stripe expects amount in cents
    currency,
  });
};

module.exports = { createStripePaymentIntent };
