const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['complaint', 'assignment', 'status', 'system'], default: 'complaint' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  relatedId: { type: String, default: null }, // complaint ID or other related entity
  read: { type: Boolean, default: false },
  actionUrl: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
