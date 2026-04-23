const mongoose = require("mongoose");
const { CLASS_OPTIONS } = require("./User");

const attendanceSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    class: {
      type: String,
      enum: CLASS_OPTIONS,
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    marked_at: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ["face"],
      default: "face"
    }
  },
  {
    collection: "attendance",
    versionKey: false
  }
);

attendanceSchema.index({ student_id: 1, session_id: 1 }, { unique: true });
attendanceSchema.index({ session_id: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
