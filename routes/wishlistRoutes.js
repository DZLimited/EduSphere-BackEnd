const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('student'));

router.get('/', getWishlist);
router.post('/:courseId', addToWishlist);
router.delete('/:courseId', removeFromWishlist);

module.exports = router;