const Notification = require('../models/Notification');

// Small reusable helper so every controller that needs to notify someone
// doesn't repeat the same Notification.create({...}) boilerplate.
const createNotification = async ({ user, type, message, link }) => {
  try {
    await Notification.create({ user, type, message, link });
  } catch (err) {
    // Never let a notification failure break the main action (e.g. course approval
    // should still succeed even if, for some reason, the notification insert fails).
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = createNotification;