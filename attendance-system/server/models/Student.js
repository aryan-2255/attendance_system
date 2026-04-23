const mongoose = require("mongoose");
const { CLASS_OPTIONS } = require("./User");

const studentSchema = new mongoose.Schema(
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
    roll_no: {
      type: String,
      required: true,
      trim: true
    },
    class: {
      type: String,
      enum: CLASS_OPTIONS,
      required: true
    },
    face_embedding: {
      type: [Number],
      default: [],
      validate: {
        validator(value) {
          return value.length === 0 || value.length === 128;
        },
        message: "face_embedding must contain exactly 128 numbers"
      }
    },
    face_registered: {
      type: Boolean,
      default: false
    },
    registered_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "students",
    versionKey: false
  }
);

studentSchema.index({ class: 1, roll_no: 1 });

studentSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password_hash;
  delete obj.face_embedding;
  return obj;
};

module.exports = mongoose.model("Student", studentSchema);
