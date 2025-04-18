const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const Student = require("../models/Student");
const User = require("../models/User");

// Middleware to require authentication (JWT validation)
// You should already have something like this in your project
const auth = require("../middleware/auth");

// Drop-off a student
router.post("/dropoff/:studentId", auth, async (req, res) => {
  const { studentId } = req.params;
  const parentId = req.user.id;

  try {
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Only parent of the student can check them in
    if (student.parentId.toString() !== parentId) {
      return res.status(403).json({ message: "Not authorized to update this student" });
    }

    // Update student status
    student.status = "checked-in";
    student.lastActivity = new Date();
    await student.save();

    // Create log
    const log = new Log({
      studentId,
      parentId,
      type: "dropoff",
    });
    await log.save();

    res.json({ message: "Drop-off logged", newStatus: "checked-in" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Pick-up a student
router.post("/pickup/:studentId", auth, async (req, res) => {
  const { studentId } = req.params;
  const parentId = req.user.id;

  try {
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (student.parentId.toString() !== parentId) {
      return res.status(403).json({ message: "Not authorized to update this student" });
    }

    student.status = "checked-out";
    student.lastActivity = new Date();
    await student.save();

    const log = new Log({
      studentId,
      parentId,
      type: "pickup",
    });
    await log.save();

    res.json({ message: "Pick-up logged", newStatus: "checked-out" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
