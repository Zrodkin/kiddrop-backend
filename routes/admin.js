// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Student = require("../models/Student");
const Log = require("../models/Log"); // Add this line to import the Log model
const User = require("../models/User"); // Add this to get parent names

// GET /api/admin/stats - get counts for dashboard
router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const [checkedIn, checkedOut, totalStudents] = await Promise.all([
      Student.countDocuments({ status: "checked-in" }),
      Student.countDocuments({ status: "checked-out" }),
      Student.countDocuments({})
    ]);

    const alerts = 2; // Placeholder
    res.json({ checkedIn, checkedOut, totalStudents, alerts });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// NEW ENDPOINT: GET /api/admin/logs - get activity logs
router.get("/logs", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    // Get query parameters for filtering and pagination
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;
    
    // Fetch logs with populated references to student and parent
    const logs = await Log.find()
      .sort({ timestamp: -1 }) // Most recent first
      .limit(limit)
      .skip(skip)
      .populate('studentId', 'name grade')
      .populate('parentId', 'name');
    
    // Count total logs for pagination
    const total = await Log.countDocuments();
    
    res.json({ 
      logs, 
      pagination: {
        total,
        limit,
        skip
      } 
    });
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/students - list all students
router.get("/students", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const students = await Student.find().sort({ name: 1 });
    res.json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/students - create a new student
router.post("/students", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const { name, grade, parentId } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ message: "Name and grade are required." });
    }

    const newStudent = new Student({
      name,
      grade,
      parentId, // Add parentId if provided
      status: "checked-out", // default starting status
    });

    await newStudent.save();
    
    // If parentId is provided, update user's children array
    if (parentId) {
      await User.findByIdAndUpdate(
        parentId,
        { $push: { children: newStudent._id } }
      );
    }
    
    res.status(201).json(newStudent);
  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/students/:id - update a student
router.put("/students/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const { name, grade, status, parentId } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (name) student.name = name;
    if (grade) student.grade = grade;
    if (status) student.status = status;
    
    // If parentId is changing, update both old and new parent's children arrays
    if (parentId && parentId !== student.parentId?.toString()) {
      // Remove from old parent if exists
      if (student.parentId) {
        await User.findByIdAndUpdate(
          student.parentId,
          { $pull: { children: student._id } }
        );
      }
      
      // Add to new parent
      await User.findByIdAndUpdate(
        parentId,
        { $push: { children: student._id } }
      );
      
      student.parentId = parentId;
    }

    await student.save();
    res.json(student);
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE /api/admin/students/:id - delete a student
router.delete("/students/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    // Remove student reference from parent's children array if parent exists
    if (student.parentId) {
      await User.findByIdAndUpdate(
        student.parentId,
        { $pull: { children: student._id } }
      );
    }
    
    // Delete all logs associated with this student
    await Log.deleteMany({ studentId: student._id });
    
    // Delete the student
    await Student.deleteOne({ _id: student._id });

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;