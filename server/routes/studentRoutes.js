const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { CLASS_OPTIONS } = require("../models/User");

const router = express.Router();

const signToken = (student) => {
  return jwt.sign({ id: student._id.toString(), role: "student" }, process.env.JWT_SECRET, {
    expiresIn: "24h"
  });
};

const safeStudent = (student) => {
  const obj = student.toObject ? student.toObject() : { ...student };
  delete obj.password_hash;
  delete obj.face_embedding;
  obj.role = "student";
  return obj;
};

const callPythonService = async (path, body) => {
  const raw = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
  const baseUrl = raw.startsWith("http") ? raw : `https://${raw}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      message: data.message || data.error || "Face service request failed"
    };
  }

  return data;
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, roll_no, class: className } = req.body;

    if (!name || !email || !password || !confirmPassword || !roll_no || !className) {
      return res.status(400).json({ error: "All registration fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (!CLASS_OPTIONS.includes(className)) {
      return res.status(400).json({ error: "Invalid class" });
    }

    const exists = await Student.findOne({ email: email.toLowerCase().trim() });

    if (exists) {
      return res.status(409).json({ error: "A student with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name,
      email,
      password_hash: passwordHash,
      roll_no,
      class: className,
      face_registered: false
    });

    return res.status(201).json({
      student_id: student._id,
      temp_token: signToken(student),
      student: safeStudent(student)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const student = await Student.findOne({ email: email.toLowerCase().trim() }).select(
      "+password_hash"
    );

    if (!student) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, student.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!student.face_registered) {
      return res.status(403).json({ error: "Face registration is pending" });
    }

    return res.json({ token: signToken(student), user: safeStudent(student) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/face/register", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const { base64_frame, student_id } = req.body;

    if (!base64_frame || !student_id) {
      return res.status(400).json({ error: "Face frame and student_id are required" });
    }

    if (student_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied for this student" });
    }

    const student = await Student.findById(req.user.id).select("-password_hash");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const result = await callPythonService("/register", {
      base64_frame,
      student_id
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message || "Face registration failed" });
    }

    const updatedStudent = await Student.findById(req.user.id).select("-password_hash -face_embedding");

    return res.json({
      success: true,
      message: result.message || "Face registered successfully",
      student: safeStudent(updatedStudent)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/face/verify", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const { base64_frame, session_id } = req.body;

    if (!base64_frame) {
      return res.status(400).json({ error: "Face frame is required" });
    }

    const student = await Student.findById(req.user.id).select("-password_hash");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (!student.face_registered) {
      return res.status(403).json({ error: "Face registration is required before attendance" });
    }

    const sessionQuery = {
      class: student.class,
      status: "open"
    };

    if (session_id) {
      sessionQuery._id = session_id;
    }

    const session = await Session.findOne(sessionQuery).sort({ started_at: -1 });

    if (!session) {
      return res.status(409).json({ error: "No open session found" });
    }

    const exists = await Attendance.findOne({
      student_id: student._id,
      session_id: session._id
    });

    if (exists) {
      return res.status(409).json({ error: "Already marked" });
    }

    const result = await callPythonService("/verify", {
      base64_frame,
      class_name: student.class
    });

    if (!result.matched) {
      return res.status(403).json({
        error: result.message || "Face did not match this student"
      });
    }

    const matchedStudentId = String(result.student_id);
    const distance = Number(result.distance);

    if (matchedStudentId !== student._id.toString() || Number.isNaN(distance) || distance >= 0.5) {
      return res.status(403).json({ error: "Face did not match this student" });
    }

    const attendance = await Attendance.create({
      student_id: student._id,
      session_id: session._id,
      teacher_id: session.teacher_id,
      class: student.class,
      subject: session.subject,
      method: "face"
    });

    const totalMarked = await Attendance.countDocuments({ session_id: session._id });
    const io = req.app.get("io");

    io.to(`teacher-${session.teacher_id.toString()}`).emit("attendance:marked", {
      student_name: student.name,
      marked_at: attendance.marked_at,
      total_marked: totalMarked,
      session_id: session._id
    });

    return res.status(201).json({
      success: true,
      message: "Attendance marked",
      attendance,
      total_marked: totalMarked
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Already marked" });
    }

    return res.status(500).json({ error: error.message });
  }
});

router.get("/attendance/mine", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password_hash -face_embedding");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const sessions = await Session.find({
      class: student.class,
      status: "closed"
    }).sort({ started_at: -1 });

    const marks = await Attendance.find({ student_id: student._id });
    const marksBySession = new Map(marks.map((mark) => [mark.session_id.toString(), mark]));

    const history = sessions.map((session) => {
      const mark = marksBySession.get(session._id.toString());

      return {
        session_id: session._id,
        date: session.started_at,
        subject: session.subject,
        teacher_name: session.teacher_name,
        status: mark ? "Present" : "Absent",
        marked_at: mark ? mark.marked_at : null
      };
    });

    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/class/:class", verifyToken, requireRole("teacher"), async (req, res) => {
  try {
    const className = decodeURIComponent(req.params.class);

    if (!CLASS_OPTIONS.includes(className)) {
      return res.status(400).json({ error: "Invalid class" });
    }

    const count = await Student.countDocuments({ class: className });

    return res.json({ class: className, count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
