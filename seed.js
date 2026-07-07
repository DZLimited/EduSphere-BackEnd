// One-time (or repeatable) database seeder.
// Run with:  node seed.js           -> wipes relevant collections and inserts fresh sample data
// Run with:  node seed.js --destroy -> only wipes, inserts nothing
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Category = require('./models/Category');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Lecture = require('./models/Lecture');
const Enrollment = require('./models/Enrollment');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Coupon = require('./models/Coupon');

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

  const courses = [];
  for (const data of courseData) {
    const course = await Course.create({
      ...data,
      slug: slugify(data.title),
      thumbnail: `https://picsum.photos/seed/${slugify(data.title)}/800/450`,
      language: 'English',
      status: 'published',
    });
    courses.push(course);
  }
  console.log(`Created ${courses.length} courses.`);

  // ---------- Sections + Lectures ----------
  const sampleVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';

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
        await Lecture.create({
          section: section._id,
          course: course._id,
          title: `${title} — Lecture ${i}`,
          videoUrl: sampleVideo,
          duration,
          isPreview: lectureOrder === 1 && order === 2, // first lecture of first section is free preview
          order: lectureOrder++,
        });
        totalDuration += duration;
      }
      await Course.findByIdAndUpdate(course._id, { $inc: { totalDuration } });
    }
  }
  console.log('Created sections and lectures for every course.');

  // ---------- Enrollments + Orders (Emma and Liam buy a few courses) ----------
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

  // ---------- Reviews ----------
  await Review.create({ course: courses[0]._id, student: students[0]._id, rating: 5, comment: 'Excellent course, very clear explanations!' });
  await Review.create({ course: courses[0]._id, student: students[1]._id, rating: 4, comment: 'Good content, a bit fast-paced in places.' });
  await Course.findByIdAndUpdate(courses[0]._id, { avgRating: 4.5, totalReviews: 2 });
  console.log('Created sample reviews.');

  // ---------- Coupons ----------
  await Coupon.create({
    code: 'WELCOME10', discountPercent: 10,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });
  console.log('Created a sample coupon (WELCOME10).');

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