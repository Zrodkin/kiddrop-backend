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
  lastActivity: {
    type: Date
  },
  // --- Added Fields ---
  emergencyName: {
    type: String,
    trim: true,
    default: '' // Default to empty string if desired
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
    type: String, // Suitable for storing notes from a textarea
    default: ''
  },
  authorizedPickup: {
    type: String, // Suitable for storing a list from a textarea
                 // Consider Array of Strings if more structure is needed later
    default: ''
  },
  // Note: Photo URL could be added here too if handling uploads
  // photoUrl: {
  //   type: String,
  //   default: ''
  // }

}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model("Student", studentSchema);
