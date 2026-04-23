const express = require("express");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { CLASS_OPTIONS } = require("../models/User");

const router = express.Router();

const withAttendanceCounts = async (sessions) => {
  return Promise.all(
    sessions.map(async (session) => {
      const totalMarked = await Attendance.countDocuments({ session_id: session._id });
      const obj = session.toObject();
      obj.total_marked = totalMarked;
      obj.duration_minutes = session.ended_at
        ? Math.max(1, Math.round((session.ended_at.getTime() - session.started_at.getTime()) / 60000))
        : null;
      return obj;
    })
  );
};

router.post("/start", verifyToken, requireRole("teacher"), async (req, res) => {
  try {
    const teacher = await User.findOne({
      _id: req.user.id,
      role: "teacher",
      active: true
    }).select("-password_hash");

    if (!teacher) {
      return res.status(403).json({ error: "Teacher account is inactive or missing" });
    }

    const alreadyOpen = await Session.findOne({
      teacher_id: teacher._id,
      status: "open"
    });

    if (alreadyOpen) {
      return res.status(409).json({ error: "A session is already open", session: alreadyOpen });
    }

    const classSessionOpen = await Session.findOne({
      class: teacher.class,
      status: "open"
    });

    if (classSessionOpen) {
      return res.status(409).json({ error: "Another session is already open for this class" });
    }

    const session = await Session.create({
      teacher_id: teacher._id,
      teacher_name: teacher.name,
      subject: teacher.subject,
      class: teacher.class,
      status: "open",
      started_at: new Date(),
      ended_at: null
    });

    const io = req.app.get("io");
    io.to(`class-${teacher.class}`).emit("session:opened", {
      session_id: session._id,
      teacher_name: session.teacher_name,
      subject: session.subject,
      class: session.class,
      started_at: session.started_at
    });

    return res.status(201).json({ session: { ...session.toObject(), total_marked: 0 } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/mine", verifyToken, requireRole("teacher"), async (req, res) => {
  try {
    const sessions = await Session.find({ teacher_id: req.user.id }).sort({ started_at: -1 });
    const sessionsWithCounts = await withAttendanceCounts(sessions);

    return res.json({ sessions: sessionsWithCounts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/active/:class", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const className = decodeURIComponent(req.params.class);

    if (!CLASS_OPTIONS.includes(className)) {
      return res.status(400).json({ error: "Invalid class" });
    }

    const student = await Student.findById(req.user.id).select("-password_hash -face_embedding");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.class !== className) {
      return res.status(403).json({ error: "Access denied for this class" });
    }

    const session = await Session.findOne({ class: className, status: "open" }).sort({
      started_at: -1
    });

    if (!session) {
      return res.json({ active: false, session: null, already_marked: false });
    }

    const alreadyMarked = await Attendance.exists({
      student_id: student._id,
      session_id: session._id
    });

    return res.json({
      active: true,
      session,
      already_marked: Boolean(alreadyMarked)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:id/attendance", verifyToken, requireRole("teacher"), async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      teacher_id: req.user.id
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const attendance = await Attendance.find({ session_id: session._id })
      .populate("student_id", "name email roll_no class")
      .sort({ marked_at: -1 });

    return res.json({ attendance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/end", verifyToken, requireRole("teacher"), async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      teacher_id: req.user.id
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.status === "closed") {
      return res.status(409).json({ error: "Session is already closed" });
    }

    session.status = "closed";
    session.ended_at = new Date();
    await session.save();

    const io = req.app.get("io");
    io.to(`class-${session.class}`).emit("session:closed", {
      session_id: session._id,
      ended_at: session.ended_at
    });

    const totalMarked = await Attendance.countDocuments({ session_id: session._id });

    return res.json({ session: { ...session.toObject(), total_marked: totalMarked } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
