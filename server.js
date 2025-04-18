// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:3000",   // dev port
  "http://localhost:3001",   // other dev port
  "http://localhost:3003",   // your current dev port
  "https://kiddrop.vercel.app", // if you deploy frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/auth", require("./routes/auth"));     // /signup, /login
app.use("/api/parent", require("./routes/parent")); // GET /children
app.use("/api/log", require("./routes/log"));       // POST /dropoff/:id, /pickup/:id
app.use("/api/admin", require("./routes/admin"));   // GET /stats

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});