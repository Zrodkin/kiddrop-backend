const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  console.log(`🔒 Auth middleware accessed: ${req.method} ${req.path}`);
  
  // Skip auth for preflight requests
  if (req.method === "OPTIONS") {
    console.log("⏩ Skipping auth check for OPTIONS request");
    return next();
  }

  const authHeader = req.header("Authorization");
  console.log("🔑 Auth header present:", !!authHeader);
  
  const token = authHeader?.split(" ")[1] || req.header("x-auth-token");
  console.log("🔑 Token extracted:", !!token);

  if (!token) {
    console.log("❌ No token found in request");
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    console.log("🔍 JWT Secret exists:", !!process.env.JWT_SECRET);
    console.log("🔍 JWT Secret length:", process.env.JWT_SECRET?.length);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified successfully");
    console.log("👤 User data:", { id: decoded.id, role: decoded.role });
    
    req.user = decoded; // contains { id, role }
    next();
  } catch (err) {
    console.error("❌ JWT Error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};