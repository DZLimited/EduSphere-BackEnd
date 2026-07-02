const express = require('express');
const router = express.Router();
const {
  getPendingCourses,
  getAllCoursesAdmin,
  approveCourse,
  rejectCourse,
  unpublishCourse,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Every route here is admin-only — apply once at the router level instead of per-route
router.use(protect, authorize('admin'));

router.get('/courses/pending', getPendingCourses);
router.get('/courses', getAllCoursesAdmin);
router.put('/courses/:id/approve', approveCourse);
router.put('/courses/:id/reject', rejectCourse);
router.put('/courses/:id/unpublish', unpublishCourse);

module.exports = router;