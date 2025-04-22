// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  senderId: { // Admin who sent it
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  alertType: { // 'emergency', 'general', 'friendly'
    type: String,
    enum: ['emergency', 'general', 'friendly'],
    required: true
  },
  audienceType: { // 'all', 'grades', 'individuals', 'staff'
    type: String,
    enum: ['all', 'grades', 'individuals', 'staff'],
    required: true
  },
  // Store specific recipients based on audienceType
  recipientGrades: { // Array of grade names if audienceType is 'grades'
    type: [String],
    default: undefined // Only present if applicable
  },
  recipientParentIds: { // Array of User IDs if audienceType is 'individuals'
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: undefined // Only present if applicable
  },
  // Note: For 'staff' or 'all', you might query users by role='parent'/'staff' at send time
  // rather than storing all IDs here, especially if the list is large.
  // Or you could store a flag like 'sentToAllParents: true'.

  subject: {
    type: String,
    required: true,
    trim: true
  },
  messageBody: {
    type: String,
    required: true
  },
  link: { // Optional link
    type: String,
    trim: true
  },
  // We won't handle file attachments in this simple version yet
  // attachmentUrl: { type: String },

  deliveryMethods: { // Object indicating how it was intended to be sent
    app: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  scheduledAt: { // If scheduled for later
    type: Date
  },
  sentAt: { // Actual time it was processed/sent
    type: Date,
    default: Date.now // Set when saved, unless scheduled
  },
  // Optional: Add fields later for tracking read status per recipient if needed

}, { timestamps: true }); // Adds createdAt, updatedAt

module.exports = mongoose.model("Notification", notificationSchema);
