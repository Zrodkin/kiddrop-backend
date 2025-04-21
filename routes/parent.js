const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Student = require("../models/Student");

// GET /api/parent/children - Get all children for logged-in parent
router.get("/children", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    const students = await Student.find({ parentId: req.user.id });
    res.json(students);
  } catch (err) {
    console.error("Error fetching children:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/parent/child/:id - Get a single child by ID
router.get("/child/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      parentId: req.user.id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/parent/child - Add a new child
router.post("/child", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    const {
      name,
      grade,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      allergies,
      authorizedPickup,
    } = req.body;

    if (!name || !grade) {
      return res.status(400).json({ message: "Name and grade are required." });
    }

    const newStudent = new Student({
      name,
      grade,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      allergies,
      authorizedPickup,
      parentId: req.user.id,
    });

    await newStudent.save();
    res.status(201).json({ message: "Child added successfully", student: newStudent });
  } catch (err) {
    console.error("Error adding student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/parent/child/:id - Update a child's information
router.put("/child/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "Access denied: parent only" });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      parentId: req.user.id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const fields = [
      "grade",
      "emergencyName",
      "emergencyPhone",
      "emergencyRelation",
      "allergies",
      "authorizedPickup",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();
    res.json({ message: "Student updated", student });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
