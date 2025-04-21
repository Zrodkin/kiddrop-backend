const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["checked-in", "checked-out", "awaiting"],
    default: "awaiting"
  },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  lastActivity: {
    type: Date
  },
  emergencyName: {
    type: String,
    trim: true,
    default: ''
  },
  emergencyPhone: {
    type: String,
    trim: true,
    default: ''
  },
  emergencyRelation: {
    type: String,
    trim: true,
    default: ''
  },
  allergies: {
    type: String,
    default: ''
  },
  authorizedPickup: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
