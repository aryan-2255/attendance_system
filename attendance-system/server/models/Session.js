const mongoose = require("mongoose");
const { CLASS_OPTIONS } = require("./User");

const sessionSchema = new mongoose.Schema(
  {
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    teacher_name: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    class: {
      type: String,
      enum: CLASS_OPTIONS,
      required: true
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    },
    started_at: {
      type: Date,
      default: Date.now
    },
    ended_at: {
      type: Date,
      default: null
    }
  },
  {
    collection: "sessions",
    versionKey: false
  }
);

sessionSchema.index({ teacher_id: 1, status: 1 });
sessionSchema.index({ class: 1, status: 1 });

module.exports = mongoose.model("Session", sessionSchema);
