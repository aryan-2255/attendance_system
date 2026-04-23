require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");
const adminRoutes = require("./routes/adminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const registerSocketHandlers = require("./socket/socketHandler");

const app = express();
const server = http.createServer(app);

const rawClientUrls =
  process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = rawClientUrls
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const port = process.env.PORT || 5000;

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("CORS blocked for this origin"));
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  }
});

app.set("io", io);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/sessions", sessionRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

registerSocketHandlers(io);

const seedAdmin = async () => {
  const exists = await User.findOne({ role: "admin" });

  if (!exists) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed admin");
    }

    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    await User.create({
      name: "Admin",
      email: process.env.ADMIN_EMAIL,
      password_hash: hash,
      role: "admin"
    });

    console.log("Admin seeded");
  }
};

const start = async () => {
  try {
    await connectDB();
    await seedAdmin();

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
