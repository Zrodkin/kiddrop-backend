// backend/seed.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Student = require("./models/Student");

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing test data
    await User.deleteMany({ email: "parent@example.com" });
    await Student.deleteMany({});

    // Create parent user
    const hashedPassword = await bcrypt.hash("password123", 10);
    const parent = new User({
      email: "parent@example.com",
      password: hashedPassword,
      role: "parent",
    });
    await parent.save();
    console.log("👨‍👧 Parent user created:", parent.email);

    // Create students
    const students = [
      { name: "Alice Smith", grade: "3", parentId: parent._id, status: "checked-out" },
      { name: "Bob Johnson", grade: "5", parentId: parent._id, status: "checked-in" },
      { name: "Charlie Brown", grade: "1", parentId: parent._id, status: "checked-out" },
    ];

    await Student.insertMany(students);
    console.log("🎒 Students created:", students.map(s => s.name).join(", "));

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
