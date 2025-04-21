// backend/server.js (Corrected Version - No app.options)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS Middleware - Using options object with app.use()
// This should handle preflight requests for routes defined AFTER it.
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "https://kiddrop.vercel.app",
  "https://kiddrop-backend.herokuapp.com",
  "https://kiddrop-7652818b8f01.herokuapp.com",
  "https://shalohgo-q1aa4d5tc-zalmanrodkin-gmailcoms-projects.vercel.app",
];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser compatibility
};
app.use(cors(corsOptions));

// REMOVED the app.options line as it caused the startup error

// ✅ Body parser
app.use(express.json());

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Routes (Now uncommented and included)
app.use("/api/auth", require("./routes/auth"));      // signup, login
app.use("/api/parent", require("./routes/parent")); // children routes
app.use("/api/log", require("./routes/log"));       // dropoff, pickup
app.use("/api/admin", require("./routes/admin"));   // admin stats, logs, etc.

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
