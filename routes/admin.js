// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Student = require("../models/Student");
const Log = require("../models/Log"); // Add this line to import the Log model
const User = require("../models/User"); // Add this to get parent names
const Notification = require("../models/Notification"); // Add this line

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

    if (student.parentId) {
      await User.findByIdAndUpdate(
        student.parentId,
        { $pull: { children: student._id } }
      );
    }

    await Log.deleteMany({ studentId: student._id });
    await Student.deleteOne({ _id: student._id });

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/students/:id/approval - Approve or reject a child
router.patch("/students/:id/approval", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const { approvalStatus } = req.body;

    if (!["pending", "approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ message: "Invalid approval status." });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    student.approvalStatus = approvalStatus;

    // Optionally update student.status as well
    if (approvalStatus === "approved") {
      student.status = "awaiting"; // or "checked-out" if you prefer
    }

    await student.save();

    res.json({ message: `Student ${approvalStatus}`, student });
  } catch (err) {
    console.error("Error updating approval status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/parents - Get all users with role 'parent'
router.get("/parents", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: admin only" });
    }

    const parents = await User.find({ role: "parent" }).select("_id name email createdAt");
    res.json(parents);
  } catch (err) {
    console.error("Error fetching parents:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add this route handler inside backend/routes/admin.js

// POST /api/admin/send-alert - Receive and process alert data
router.post("/send-alert", auth, async (req, res) => {
  // Ensure only admins can send alerts
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: admin only" });
  }

  console.log("📨 Received /api/admin/send-alert request");
  console.log("Request Body:", req.body);

  // Destructure expected data from frontend request body
  const {
    alertType,
    audienceType, // Changed from 'audience' to match frontend state key more closely
    selectedGrades,
    selectedParentIds, // Expecting an array of IDs from frontend now
    subject,
    messageBody,
    link,
    deliveryMethods,
    scheduleLater,
    scheduledDateTime
  } = req.body;

  // Basic Validation
  if (!alertType || !audienceType || !subject || !messageBody || !deliveryMethods) {
    return res.status(400).json({ message: "Missing required alert fields." });
  }
  if (audienceType === 'grades' && (!selectedGrades || selectedGrades.length === 0)) {
    return res.status(400).json({ message: "Please select target grades." });
  }
  if (audienceType === 'individuals' && (!selectedParentIds || selectedParentIds.length === 0)) {
    return res.status(400).json({ message: "Please select target parents." });
  }
  if (scheduleLater && !scheduledDateTime) {
      return res.status(400).json({ message: "Please provide a date/time for scheduled alert." });
  }

  try {
    // --- Prepare Notification Document ---
    const notificationData = {
      senderId: req.user.id, // Logged-in admin's ID from auth middleware
      alertType,
      audienceType,
      subject,
      messageBody,
      link: link || undefined, // Only save if provided
      deliveryMethods,
      sentAt: scheduleLater ? undefined : new Date(), // Set sentAt now only if not scheduling
      scheduledAt: scheduleLater ? new Date(scheduledDateTime) : undefined,
      // Add recipient details based on audience type
      ...(audienceType === 'grades' && { recipientGrades: selectedGrades }),
      ...(audienceType === 'individuals' && { recipientParentIds: selectedParentIds }),
    };

    // --- Save Notification to Database ---
    // In this version, we just save the record.
    // Real implementation would involve:
    // 1. If not scheduled: Fetch actual recipient emails/phones based on audience.
    // 2. Integrate with Nodemailer/Twilio/etc. to send emails/SMS.
    // 3. Potentially create individual notification records per user for read tracking.
    // 4. Handle scheduling logic (e.g., using a job queue like Agenda or Bull).

    const newNotification = new Notification(notificationData);
    await newNotification.save();

    console.log("✅ Notification saved:", newNotification._id);

    // --- Send Response ---
    res.status(201).json({
      message: scheduleLater ? "Alert scheduled successfully!" : "Alert saved successfully! (Sending logic TBD)",
      notification: newNotification // Send back the saved notification
    });

  } catch (err) {
    console.error("❌ Error processing send-alert:", err);
    // Check for specific errors like invalid date format for scheduling
    if (err instanceof Error && err.message.includes('Invalid time value')) {
        return res.status(400).json({ message: "Invalid scheduled date/time format." });
    }
    res.status(500).json({ message: "Server error processing alert" });
  }
});

// Make sure module.exports = router; is at the very bottom of the file



// ✅ Export the router
module.exports = router;
