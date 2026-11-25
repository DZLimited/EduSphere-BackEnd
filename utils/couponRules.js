// Single source of truth for "can this coupon be used on these courses?".
// Used by both POST /api/coupons/validate (checkout preview) and
// POST /api/orders (the real checkout), so the two can never disagree —
// previously checkout skipped the applicableCourses check entirely.
//
// Returns null when the coupon is usable, otherwise a { status, message } describing why not.
const getCouponError = (coupon, courseIds = []) => {
  if (!coupon) return { status: 404, message: 'Invalid coupon code' };
  if (!coupon.isActive) return { status: 400, message: 'This coupon is no longer active' };
  if (coupon.expiresAt < new Date()) return { status: 400, message: 'This coupon has expired' };
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { status: 400, message: 'This coupon has reached its usage limit' };
  }

  // Empty applicableCourses = applies to everything; otherwise every course must be allowed.
  if (coupon.applicableCourses?.length > 0) {
    const allowed = new Set(coupon.applicableCourses.map((c) => c.toString()));
    const allApplicable = courseIds.every((id) => allowed.has(id.toString()));
    if (!allApplicable) {
      return { status: 400, message: 'This coupon does not apply to all courses in your cart' };
    }
  }

  return null;
};

module.exports = { getCouponError };
