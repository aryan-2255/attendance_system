const { CLASS_OPTIONS } = require("../models/User");

const isValidClass = (className) => CLASS_OPTIONS.includes(className);

const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-class", ({ class: className } = {}) => {
      if (isValidClass(className)) {
        socket.join(`class-${className}`);
      }
    });

    socket.on("join-teacher", ({ teacherId } = {}) => {
      if (teacherId) {
        socket.join(`teacher-${teacherId}`);
      }
    });

    socket.on("start-session", (payload = {}) => {
      const className = payload.class;

      if (isValidClass(className)) {
        io.to(`class-${className}`).emit("session:opened", {
          session_id: payload.sessionId,
          teacher_name: payload.teacher_name,
          subject: payload.subject,
          started_at: payload.started_at
        });
      }
    });

    socket.on("end-session", ({ class: className } = {}) => {
      if (isValidClass(className)) {
        io.to(`class-${className}`).emit("session:closed", {});
      }
    });
  });
};

module.exports = registerSocketHandlers;
