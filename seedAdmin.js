// backend/seedAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existingAdmin = await User.findOne({ email: "admin@example.com" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists.");
      return process.exit();
    }

    const hashedPassword = await bcrypt.hash("adminpass123", 10);

    const admin = new User({
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    console.log("👨‍💼 Admin seeded: admin@example.com / adminpass123");
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
  } finally {
    mongoose.disconnect();
  }
}

seedAdmin();
