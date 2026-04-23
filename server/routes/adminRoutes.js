const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { CLASS_OPTIONS } = require("../models/User");

const router = express.Router();

const signToken = (user) => {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "24h"
  });
};

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password_hash");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied for admin portal" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.json({ token: signToken(user), user: user.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/teachers", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, subject, class: className } = req.body;

    if (!name || !email || !password || !subject || !className) {
      return res.status(400).json({ error: "All teacher fields are required" });
    }

    if (!CLASS_OPTIONS.includes(className)) {
      return res.status(400).json({ error: "Invalid class" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });

    if (exists) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await User.create({
      name,
      email,
      password_hash: passwordHash,
      role: "teacher",
      subject,
      class: className
    });

    return res.status(201).json({ teacher: teacher.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/teachers", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("-password_hash")
      .sort({ created_at: -1 });

    return res.json({ teachers });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/teachers/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: "teacher" },
      { active: false },
      { new: true }
    ).select("-password_hash");

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    return res.json({ teacher });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
