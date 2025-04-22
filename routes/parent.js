const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Assuming your auth middleware is here
const Student = require("../models/Student");
const User = require("../models/User"); // Need User model to update parent
const Notification = require("../models/Notification");


// Add at the top of your routes in parent.js
router.get("/test", (req, res) => {
  console.log("Test route hit");
  res.status(200).json({ message: "Parent route test successful" });
});

// --- GET /api/parent/children --- Get all children for logged-in parent
router.get("/children", auth, async (req, res) => {
  try {
    // Ensure user is a parent (optional check if ProtectedRoute handles it)
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    // Find students associated with the logged-in parent's ID
    const students = await Student.find({ parentId: req.user.id }).sort({ name: 1 }); // Sort alphabetically
    res.json(students);

  } catch (err) {
    console.error("Error fetching children:", err);
    res.status(500).json({ message: "Server error fetching children" });
  }
});

// --- GET /api/parent/child/:id --- Get a single child by ID (ensure parent owns it)
router.get("/child/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    // Find specific child only if parentId matches the logged-in user
    const student = await Student.findOne({
      _id: req.params.id,
      parentId: req.user.id,
    });

    if (!student) {
      // Return 404 if student not found OR doesn't belong to this parent
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("Error fetching student:", err);
    // Handle potential CastError if ID format is invalid
    if (err.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid student ID format" });
    }
    res.status(500).json({ message: "Server error fetching student" });
  }
});

// GET /api/parent/notifications - Get all notifications for logged-in parent
router.get("/notifications", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 }) // Most recent first
      .select("subject messageBody link read alertType sentAt"); // Limit fields for frontend

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Server error fetching notifications" });
  }
});

// PATCH /api/parent/notifications/:id/read - Mark notification as read
router.patch("/notifications/:id/read", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Marked as read", notification: updated });
  } catch (err) {
    console.error("Error updating notification:", err);
    res.status(500).json({ message: "Server error updating notification" });
  }
});


// --- POST /api/parent/child --- Add a new child (Added Back)
router.post("/child", auth, async (req, res) => {
  console.log("📝 POST /api/parent/child endpoint hit");
  console.log("📦 Request body:", req.body);

  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    // Destructure all relevant fields from request body
    const {
      name, grade, emergencyName, emergencyPhone,
      emergencyRelation, allergies, authorizedPickup,
      // Add any other fields from your Student model you want to set on creation
    } = req.body;

    // Basic validation
    if (!name || !grade) {
      return res.status(400).json({ message: "Child's Name and Grade are required." });
    }

    // Create new student instance, linking to the logged-in parent
    const newStudent = new Student({
      name,
      grade,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      allergies,
      authorizedPickup,
      parentId: req.user.id, // Assign logged-in parent's ID
      status: 'awaiting', // Sensible default status
    });

    // Save the new student document
    await newStudent.save();

    // --- Add student reference to parent's document ---
    // This is important for easily finding children from the user later
    await User.findByIdAndUpdate(
        req.user.id,
        { $push: { children: newStudent._id } } // Add the new student's ID to the parent's children array
    );
    console.log(`✅ Added student ${newStudent._id} to parent ${req.user.id}`);
    // --- End parent update ---

    // Send success response
    res.status(201).json({ message: "Child added successfully", student: newStudent });

  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ message: "Server error adding child" });
  }
});


// --- PUT /api/parent/child/:id --- Update a child's information
router.put("/child/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    // Find the specific student belonging to this parent
    const student = await Student.findOne({
      _id: req.params.id,
      parentId: req.user.id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found or not authorized" });
    }

    // List of fields the parent is allowed to update
    // Ensure these fields EXIST on your Student model!
    const allowedUpdateFields = [
      "grade", "emergencyName", "emergencyPhone",
      "emergencyRelation", "allergies", "authorizedPickup",
      // Add 'name' here ONLY if parents ARE allowed to change it
      // Add 'photoUrl' here if handling photo updates
    ];

    // Update only the allowed fields that are present in the request body
    let changesMade = false;
    allowedUpdateFields.forEach((field) => {
      if (req.body[field] !== undefined && student[field] !== req.body[field]) {
        student[field] = req.body[field];
        changesMade = true;
      }
    });

    // Only save if changes were actually made
    if (changesMade) {
        await student.save();
        res.json({ message: "Student updated successfully", student });
    } else {
        res.json({ message: "No changes detected", student }); // Or return 204 No Content
    }

  } catch (err) {
    console.error("Error updating student:", err);
     if (err.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid student ID format" });
    }
    res.status(500).json({ message: "Server error updating student" });
  }
});

module.exports = router; // Ensure router is exported
