const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

    if (user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied for teacher portal" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "Teacher account is inactive" });
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

module.exports = router;
