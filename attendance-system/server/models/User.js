const mongoose = require("mongoose");

const CLASS_OPTIONS = ["10-A", "10-B", "11-A", "11-B", "12-A", "12-B"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password_hash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["admin", "teacher"],
      required: true
    },
    subject: {
      type: String,
      trim: true
    },
    class: {
      type: String,
      enum: CLASS_OPTIONS
    },
    active: {
      type: Boolean,
      default: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "users",
    versionKey: false
  }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password_hash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
module.exports.CLASS_OPTIONS = CLASS_OPTIONS;
