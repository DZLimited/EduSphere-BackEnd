// One-time (or repeatable) database seeder.
// Run with:  node seed.js           -> wipes relevant collections and inserts fresh sample data
// Run with:  node seed.js --destroy -> only wipes, inserts nothing
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const generateSeedThumbnail = require('./utils/generateSeedThumbnail');

const User = require('./models/User');
const Category = require('./models/Category');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Lecture = require('./models/Lecture');
const Enrollment = require('./models/Enrollment');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Coupon = require('./models/Coupon');
const Discussion = require('./models/Discussion');
const Payout = require('./models/Payout');

const slugify = (text) =>
  text.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

const destroy = async () => {
  await Promise.all([
    User.deleteMany(),
    Category.deleteMany(),
    Course.deleteMany(),
    Section.deleteMany(),
    Lecture.deleteMany(),
    Enrollment.deleteMany(),
    Order.deleteMany(),
    Review.deleteMany(),
    Coupon.deleteMany(),
    Discussion.deleteMany(),
    Payout.deleteMany(),
  ]);
  console.log('All collections cleared.');
};

const seed = async () => {
  await destroy();

  // ---------- Users ----------
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await User.create({
    name: 'Admin User', email: 'admin@edusphere.com', password: passwordHash, role: 'admin', isVerified: true,
  });

  const teachers = await User.insertMany([
    { name: 'Daniyal Zafar', email: 'daniyal@edusphere.com', password: passwordHash, role: 'teacher', bio: 'Full-stack developer and instructor with 8 years of experience.', isVerified: true },
    { name: 'Taha Saleem', email: 'taha@edusphere.com', password: passwordHash, role: 'teacher', bio: 'Data scientist teaching Python and ML for 5 years.', isVerified: true },
    { name: 'Sohrab Ahmed', email: 'sohrab@edusphere.com', password: passwordHash, role: 'teacher', bio: 'UI/UX designer passionate about teaching design fundamentals.', isVerified: true },
  ]);

  const students = await User.insertMany([
    { name: 'Sharjeel Tariq', email: 'sharjeel@edusphere.com', password: passwordHash, role: 'student', isVerified: true },
    { name: 'Kashif Mehmood', email: 'kashif@edusphere.com', password: passwordHash, role: 'student', isVerified: true },
    { name: 'Dani', email: 'dani@edusphere.com', password: passwordHash, role: 'student', isVerified: true },
    { name: 'Manan Ali', email: 'manan@edusphere.com', password: passwordHash, role: 'student', isVerified: true },
  ]);

  const parent = await User.create({
    name: 'Zafar Mehmood', email: 'zafar@edusphere.com', password: passwordHash, role: 'parent', isVerified: true,
  });

  console.log(`Created ${teachers.length + students.length + 2} users.`);

  // ---------- Categories ----------
  const categoryNames = ['Web Development', 'Data Science', 'Design', 'Business', 'Photography', 'Marketing'];
  const categories = await Category.insertMany(
    categoryNames.map((name) => ({ name, slug: slugify(name) }))
  );
  console.log(`Created ${categories.length} categories.`);

  // ---------- Courses ----------
  const courseData = [
    {
      title: 'Complete React Developer Course',
      description: 'Learn React from scratch — hooks, context, routing, and real-world projects.',
      teacher: teachers[0]._id, category: categories[0]._id, level: 'intermediate', price: 49.99,
      whatYouWillLearn: ['Build production-ready React apps', 'Master hooks and context', 'Deploy to real hosting'],
      requirements: ['Basic JavaScript knowledge'],
    },
    {
      title: 'Node.js & Express API Masterclass',
      description: 'Build robust REST APIs with Node, Express, and MongoDB.',
      teacher: teachers[0]._id, category: categories[0]._id, level: 'intermediate', price: 39.99,
      whatYouWillLearn: ['Design REST APIs', 'Authentication with JWT', 'Connect to MongoDB'],
      requirements: ['Basic JavaScript knowledge'],
    },
    {
      title: 'Python for Data Science',
      description: 'Master Python, Pandas, and NumPy for real data analysis.',
      teacher: teachers[1]._id, category: categories[1]._id, level: 'beginner', price: 44.99,
      whatYouWillLearn: ['Data cleaning with Pandas', 'Visualization with Matplotlib', 'Intro to ML'],
      requirements: ['No prior experience needed'],
    },
    {
      title: 'Machine Learning A-Z',
      description: 'From linear regression to neural networks, hands-on.',
      teacher: teachers[1]._id, category: categories[1]._id, level: 'advanced', price: 59.99,
      whatYouWillLearn: ['Supervised and unsupervised learning', 'Build and train models', 'Model evaluation'],
      requirements: ['Basic Python and statistics'],
    },
    {
      title: 'UI/UX Design Fundamentals',
      description: 'Learn design thinking, wireframing, and prototyping in Figma.',
      teacher: teachers[2]._id, category: categories[2]._id, level: 'beginner', price: 34.99,
      whatYouWillLearn: ['Design thinking process', 'Wireframing and prototyping', 'Figma fundamentals'],
      requirements: ['None'],
    },
    {
      title: 'Digital Marketing Fundamentals',
      description: 'SEO, social media, and paid ads — the full picture.',
      teacher: teachers[2]._id, category: categories[3]._id, level: 'beginner', price: 0,
      whatYouWillLearn: ['SEO basics', 'Social media strategy', 'Running paid ad campaigns'],
      requirements: ['None'],
    },
  ];

  const categoryMap = {};
  categories.forEach((cat) => { categoryMap[cat._id.toString()] = cat.name; });

  const courses = [];
  for (const data of courseData) {
    const categoryName = categoryMap[data.category.toString()];
    const course = await Course.create({
      ...data,
      slug: slugify(data.title),
      thumbnail: generateSeedThumbnail(data.title, categoryName),
      language: 'English',
      status: 'published',
    });
    courses.push(course);
  }
  console.log(`Created ${courses.length} courses.`);

  // ---------- Sections + Lectures ----------
  const sampleVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';
  // Track the first lecture of each course so Q&A has something real to attach to
  const firstLectureByCourse = {};

  for (const course of courses) {
    const sectionTitles = ['Getting Started', 'Core Concepts', 'Building a Real Project'];
    let order = 1;
    for (const title of sectionTitles) {
      const section = await Section.create({ course: course._id, title, order: order++ });

      let lectureOrder = 1;
      let totalDuration = 0;
      const lectureCount = 3;
      for (let i = 1; i <= lectureCount; i++) {
        const duration = 300 + i * 60;
        const lecture = await Lecture.create({
          section: section._id,
          course: course._id,
          title: `${title} — Lecture ${i}`,
          videoUrl: sampleVideo,
          duration,
          isPreview: lectureOrder === 1 && order === 2,
          order: lectureOrder++,
        });
        totalDuration += duration;
        if (!firstLectureByCourse[course._id.toString()]) {
          firstLectureByCourse[course._id.toString()] = lecture;
        }
      }
      await Course.findByIdAndUpdate(course._id, { $inc: { totalDuration } });
    }
  }
  console.log('Created sections and lectures for every course.');

  // ---------- Enrollments + Orders ----------
  const enrollPairs = [
    { student: students[0], course: courses[0] },
    { student: students[0], course: courses[2] },
    { student: students[1], course: courses[0] },
    { student: students[2], course: courses[4] },
  ];

  for (const { student, course } of enrollPairs) {
    const order = await Order.create({
      student: student._id,
      courses: [{ course: course._id, priceAtPurchase: course.price }],
      totalAmount: course.price,
      paymentGateway: 'mock',
      paymentIntentId: `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paymentStatus: 'success',
    });

    await Enrollment.create({ student: student._id, course: course._id, order: order._id, progressPercent: Math.floor(Math.random() * 80) });
    await Course.findByIdAndUpdate(course._id, { $inc: { totalStudents: 1 } });
  }
  console.log(`Created ${enrollPairs.length} enrollments with orders.`);

  // ---------- An extra order using the WELCOME10 coupon, so Orders reflect a real discount ----------
  const discountedOrder = await Order.create({
    student: students[3]._id,
    courses: [{ course: courses[3]._id, priceAtPurchase: courses[3].price }],
    coupon: null, // set below once the coupon exists, see note after Coupons section
    totalAmount: Number((courses[3].price * 0.9).toFixed(2)),
    paymentGateway: 'mock',
    paymentIntentId: `seed_${Date.now()}_coupon`,
    paymentStatus: 'success',
  });
  await Enrollment.create({ student: students[3]._id, course: courses[3]._id, order: discountedOrder._id, progressPercent: 15 });
  await Course.findByIdAndUpdate(courses[3]._id, { $inc: { totalStudents: 1 } });
  console.log('Created a discounted order + enrollment (Manan Ali, Machine Learning A-Z).');

  // ---------- Reviews ----------
  await Review.create({ course: courses[0]._id, student: students[0]._id, rating: 5, comment: 'Excellent course, very clear explanations!' });
  await Review.create({ course: courses[0]._id, student: students[1]._id, rating: 4, comment: 'Good content, a bit fast-paced in places.' });
  await Course.findByIdAndUpdate(courses[0]._id, { avgRating: 4.5, totalReviews: 2 });
  console.log('Created sample reviews.');

  // ---------- Coupons ----------
  const welcomeCoupon = await Coupon.create({
    code: 'WELCOME10', discountPercent: 10,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usedCount: 1, // reflects the discounted order above
  });
  await Order.findByIdAndUpdate(discountedOrder._id, { coupon: welcomeCoupon._id });
  console.log('Created a sample coupon (WELCOME10), linked to the discounted order.');

  // ---------- Wishlist ----------
  // Sharjeel is enrolled in React + Python already; wishlist a couple more he hasn't bought yet.
  await User.findByIdAndUpdate(students[0]._id, {
    $addToSet: { wishlist: { $each: [courses[1]._id, courses[4]._id] } },
  });
  // Kashif wishlists the ML course.
  await User.findByIdAndUpdate(students[1]._id, {
    $addToSet: { wishlist: [courses[3]._id] },
  });
  console.log('Added sample wishlist entries for 2 students.');

  // ---------- Q&A / Discussions ----------
  const reactLecture = firstLectureByCourse[courses[0]._id.toString()];
  const pythonLecture = firstLectureByCourse[courses[2]._id.toString()];

  await Discussion.create({
    course: courses[0]._id,
    lecture: reactLecture._id,
    student: students[0]._id,
    question: 'Do I need to know class components before starting this, or is it all hooks-based?',
    answer: "It's all hooks-based — no class component knowledge required. We cover everything from scratch.",
    answeredAt: new Date(),
  });
  await Discussion.create({
    course: courses[0]._id,
    lecture: reactLecture._id,
    student: students[1]._id,
    question: 'Is the final project deployed anywhere I can see a live demo first?',
    // left unanswered on purpose, so the Teacher "Unanswered" tab has something to show
  });
  await Discussion.create({
    course: courses[2]._id,
    lecture: pythonLecture._id,
    student: students[0]._id,
    question: 'Which Python version are the code examples using?',
    answer: 'Python 3.11+. Anything 3.9 or newer will work fine for every example in this course.',
    answeredAt: new Date(),
  });
  console.log('Created 3 Q&A discussions (2 answered, 1 unanswered).');

  // ---------- Payouts ----------
  // Give teachers some earnings first (checkout normally does this via orderController,
  // but we're inserting orders directly above, so we credit it here to match).
  await User.findByIdAndUpdate(teachers[0]._id, { $inc: { earnings: 49.99 + 49.99 } }); // 2 React enrollments
  await User.findByIdAndUpdate(teachers[1]._id, { $inc: { earnings: 44.99 + 53.99 } }); // Python + discounted ML
  await User.findByIdAndUpdate(teachers[2]._id, { $inc: { earnings: 0 } }); // free course, no earnings

  await Payout.create({ teacher: teachers[0]._id, amount: 40, status: 'paid', requestedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) });
  await Payout.create({ teacher: teachers[1]._id, amount: 30, status: 'requested', requestedAt: new Date() });
  await Payout.create({ teacher: teachers[0]._id, amount: 15, status: 'rejected', requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) });
  // Reflect the "paid" and "rejected" payouts in each teacher's remaining balance,
  // same reserve/refund logic the real payoutController applies.
  await User.findByIdAndUpdate(teachers[0]._id, { $inc: { earnings: -40 } }); // paid: deducted, not refunded
  // the rejected 15 was requested then refunded, so net effect on balance is zero — no further change needed
  console.log('Created 3 payout requests (paid, requested, rejected) with balances adjusted to match.');

  console.log('\n✅ Seed complete.');
  console.log('\nLogin with any of these (all use password: password123):');
  console.log(`  Admin:   ${admin.email}`);
  teachers.forEach((t) => console.log(`  Teacher: ${t.email}`));
  students.forEach((s) => console.log(`  Student: ${s.email}`));
  console.log(`  Parent:  ${parent.email}`);
};

const run = async () => {
  await connectDB();

  if (process.argv.includes('--destroy')) {
    await destroy();
  } else {
    await seed();
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});