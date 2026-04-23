# Face-Recognition Attendance System

> A full-stack web application that uses **AI-powered face recognition** to mark student attendance in real time. Teachers start class sessions, students scan their face via webcam, and the system verifies their identity instantly - no manual roll-calls, no proxy attendance.



## Live Demo

| Portal | URL |
|--------|-----|
| **Landing Page** | https://attendance-client-ak60.onrender.com |
| **Admin Login** | https://attendance-client-ak60.onrender.com/admin/login |
| **Teacher Login** | https://attendance-client-ak60.onrender.com/teacher/login |
| **Student Login** | https://attendance-client-ak60.onrender.com/student/login |

> Note - Free-tier instances spin down after inactivity. First request may take up to 50 seconds to wake up.

Default admin credentials: `admin@school.com` / your chosen password



## Table of Contents

1. [What Does This Project Do?](#-what-does-this-project-do)
2. [How It Works (The Big Picture)](#-how-it-works-the-big-picture)
3. [Technology Stack](#-technology-stack)
4. [Architecture Diagram](#-architecture-diagram)
5. [Folder Structure - Complete Breakdown](#-folder-structure--complete-breakdown)
   - [Server (Backend API)](#1-server--the-backend-api)
   - [Client (Frontend UI)](#2-client--the-frontend-ui)
   - [Python Service (Face Recognition AI)](#3-python-service--the-face-recognition-ai)
   - [Root Config Files](#4-root-config-files)
6. [Database Schema](#-database-schema)
7. [API Endpoints](#-api-endpoints)
8. [Real-Time Features (WebSocket)](#-real-time-features-websocket)
9. [Security Features](#-security-features)
10. [User Flows](#-user-flows)
11. [Setup & Running Locally](#-setup--running-locally)
12. [Deployment (Render)](#-deployment-render)
13. [Default Credentials](#-default-credentials)
14. [Environment Variables](#-environment-variables)



## What Does This Project Do?

Imagine a school where:
- The **principal (admin)** creates accounts for teachers
- A **teacher** opens a "session" (like starting class)
- **Students** mark their attendance by showing their face to a webcam
- The system **recognises the student's face using AI** and confirms it's really them
- The teacher sees **live updates** - like "5 out of 30 students marked" - without refreshing

**No paper register. No lying about being present. No proxy.**

### Three Types of Users

| User | What they can do |
|------|-----------------|
| **Admin** | Create teacher accounts, deactivate teachers |
| **Teacher** | Start/end class sessions, view attendance reports |
| **Student** | Register their face, mark attendance via face scan |



## How It Works (The Big Picture)

Here is the step-by-step flow of the entire system, from the very beginning to marking attendance:

### Step 1 - Admin Sets Up Teachers
The admin logs in and creates a teacher account (name, email, password, subject, class). This is a one-time setup.

### Step 2 - Students Register Themselves
A student visits the registration page, fills in their details (name, email, password, roll number, class), and is taken to a **face scan page**. The webcam turns on, the student centres their face in an oval, and clicks "Capture". This sends the photo to the **Python AI service**, which detects the face using OpenCV's Haar cascade detector, crops and normalises it to a 64x64 grayscale image, and stores the L2-normalised pixel vector as their unique face signature in the database.

### Step 3 - Teacher Starts a Session
The teacher logs in and clicks "Start Session". This creates a new session in the database and **instantly notifies all students** in that class via WebSocket (real-time push). Students see "Session opened" on their screen without refreshing.

### Step 4 - Students Mark Attendance
A student clicks "Mark Attendance", the webcam opens, they scan their face. The system sends the live photo to the Python AI service, which:
1. Extracts the face embedding from the live photo
2. Fetches all stored embeddings of students in that class
3. Compares the live face to every stored face using **Euclidean distance**
4. If the closest match has a distance < 0.5, the face is verified
5. The server double-checks that the matched student ID matches the logged-in student
6. Attendance is saved in the database

### Step 5 - Teacher Sees Live Count
As each student marks attendance, the teacher's screen updates **in real time** (via WebSocket) - showing the count increase live.

### Step 6 - Teacher Ends Session
The teacher clicks "End Session". All students in that class are notified via WebSocket that the session is closed. Students can no longer mark attendance.



## Technology Stack

| Layer | Technology | Why it's used |
|-------|-----------|---------------|
| **Frontend** | React 18 + Vite | Fast, modern UI library for building interactive pages |
| **Styling** | Vanilla CSS | Custom design without framework bloat |
| **Routing** | React Router v6 | Handles different pages (login, dashboard, etc.) |
| **HTTP Client** | Axios | Sends requests from frontend to backend |
| **Backend API** | Node.js + Express | Handles all business logic (login, sessions, attendance) |
| **Database** | MongoDB Atlas (cloud) | Stores all data - users, students, sessions, attendance |
| **ODM** | Mongoose | Makes it easy to define data models and query MongoDB |
| **Authentication** | JWT (JSON Web Tokens) | Secure, stateless login tokens |
| **Real-Time** | Socket.IO | Instant push notifications (session opened, attendance marked) |
| **Face Detection (browser)** | MediaPipe (Google) | **Client-side** - detects if a face is centred and clear BEFORE sending |
| **Face Recognition (AI)** | Python + dlib + face_recognition | **Server-side** - the actual AI that creates and compares face embeddings |
| **Python API** | FastAPI + Uvicorn | Fast Python web server for face recognition endpoints |
| **Deployment** | Render (Blueprint) | One-click deployment of all 3 services from Git |



## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                        │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Admin Portal │  │Teacher Portal│  │  Student Portal      │ │
│  │  /admin/*    │  │ /teacher/*   │  │  /student/*          │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────────────┘ │
│         │                │                  │                │
│         │     MediaPipe runs HERE           │                │
│         │     (face detection in browser)   │                │
└─────────┼────────────────┼──────────────────┼────────────────┘
          │  HTTP/REST     │  HTTP + WebSocket │  HTTP/REST
          │                │                  │
┌─────────▼────────────────▼──────────────────▼────────────────┐
│                    NODE.JS SERVER (:5001)                     │
│                                                              │
│  Express API  ──►  Mongoose  ──►  MongoDB Atlas (Cloud DB)   │
│  Socket.IO    ──►  Real-time push to clients                 │
│                                                              │
│  On face verification request, calls:                        │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTP POST
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                  PYTHON SERVICE (:8000)                       │
│                                                              │
│  FastAPI + Uvicorn                                           │
│  face_recognition (dlib)  ──►  MongoDB Atlas (reads/writes)  │
│                                                              │
│  /register  →  Extract face embedding, save to DB            │
│  /verify    →  Compare live face to stored embeddings        │
└──────────────────────────────────────────────────────────────┘
```



## Folder Structure - Complete Breakdown

```
├── .gitignore                  # Tells Git which files to ignore
├── render.yaml                 # Render deployment Blueprint (all 3 services)
├── README.md                   # This file
├── client/                     # FRONTEND - what users see in the browser
│   ├── .env                    # Frontend environment variables (API URLs)
│   ├── index.html              # The single HTML page (React renders inside it)
│   ├── package.json            # Frontend dependencies and scripts
│   ├── rewrite-rules           # Render.com SPA routing config
│   ├── vite.config.js          # Vite build tool configuration
│   └── src/                    # All frontend source code
│       ├── main.jsx            # App entry point and route definitions
│       ├── global.css          # Shared styles for the entire app
│       ├── components/         # Reusable UI building blocks
│       │   ├── Loader.jsx      # Spinning loading indicator
│       │   ├── ProtectedRoute.jsx  # Blocks access if not logged in
│       │   └── WebcamCapture.jsx   # Camera + face detection + capture
│       ├── utils/              # Helper functions
│       │   ├── api.js          # Axios HTTP client (talks to backend)
│       │   ├── auth.js         # Login/logout/token management
│       │   └── faceValidation.js   # MediaPipe face detection in browser
│       └── portals/            # Separate UI for each user type
│           ├── admin/          # Admin dashboard
│           │   ├── AdminApp.jsx     # Admin route definitions
│           │   ├── LoginPage.jsx    # Admin login form
│           │   ├── Dashboard.jsx    # Main admin page (teacher management)
│           │   ├── CreateTeacher.jsx # Form to create new teachers
│           │   ├── TeacherList.jsx   # Table showing all teachers
│           │   └── admin.css        # Admin-specific styles
│           ├── teacher/        # Teacher dashboard
│           │   ├── TeacherApp.jsx    # Teacher route definitions
│           │   ├── LoginPage.jsx     # Teacher login form
│           │   ├── Dashboard.jsx     # Main teacher page
│           │   ├── SessionControl.jsx # Start/end session controls
│           │   ├── ScheduleSession.jsx # Start session button
│           │   ├── AttendanceView.jsx  # Session history table
│           │   └── teacher.css       # Teacher-specific styles
│           └── student/        # Student dashboard
│               ├── StudentApp.jsx     # Student route definitions
│               ├── LoginPage.jsx      # Student login form
│               ├── RegisterPage.jsx   # Student registration form
│               ├── FaceScanRegister.jsx # Webcam face registration (step 2)
│               ├── Dashboard.jsx      # Main student page
│               ├── MarkAttendance.jsx  # Face scan to mark attendance
│               ├── AttendanceHistory.jsx # Past attendance records table
│               └── student.css        # Student-specific styles
├── server/                     # BACKEND - business logic and API
│   ├── .env                    # Backend secrets (DB URI, JWT secret, etc.)
│   ├── Dockerfile              # Container config for deployment
│   ├── package.json            # Backend dependencies and scripts
│   ├── index.js                # Server entry point (starts everything)
│   ├── config/
│   │   └── db.js               # MongoDB connection setup
│   ├── middleware/
│   │   ├── authMiddleware.js   # Verifies JWT tokens on requests
│   │   └── roleMiddleware.js   # Checks if user has the right role
│   ├── models/                 # Database schemas (data shapes)
│   │   ├── User.js             # Admin and Teacher accounts
│   │   ├── Student.js          # Student accounts (with face data)
│   │   ├── Session.js          # Class sessions (open/closed)
│   │   └── Attendance.js       # Individual attendance records
│   ├── routes/                 # API endpoint handlers
│   │   ├── adminRoutes.js      # Admin login, create/list/deactivate teachers
│   │   ├── teacherRoutes.js    # Teacher login
│   │   ├── studentRoutes.js    # Student register, login, face scan, attendance
│   │   └── sessionRoutes.js    # Start/end sessions, get active session
│   └── socket/
│       └── socketHandler.js    # WebSocket event handlers
└── python-service/             # AI SERVICE - face recognition engine
    ├── .env                    # MongoDB connection for Python
    ├── Dockerfile              # Container config for deployment
    ├── requirements.txt        # Python dependencies
    ├── main.py                 # FastAPI app with /register and /verify endpoints
    └── face_utils.py           # Core AI logic (encode, match, store faces)
```



### 1. `server/` - The Backend API

This is the **brain** of the application. It handles all business logic, stores data, manages logins, and coordinates between the frontend and the Python AI service.

#### `server/index.js` - The Starting Point
**What:** This is the first file that runs when the server starts.
**Why:** It sets up everything - connects to the database, configures security (CORS), registers all API routes, starts the WebSocket server, and creates the default admin account.
**How it works:**
1. Reads settings from `.env` file
2. Connects to MongoDB Atlas (cloud database)
3. Creates the admin account if it doesn't exist yet (called "seeding")
4. Sets up Express with CORS (Cross-Origin Resource Sharing) so the frontend can talk to it
5. Mounts all route handlers (`/api/admin`, `/api/teacher`, `/api/student`, `/api/sessions`)
6. Starts Socket.IO for real-time communication
7. Listens on port 5001

#### `server/config/db.js` - Database Connection
**What:** Connects the server to MongoDB Atlas (a cloud database).
**Why:** Every piece of data (users, students, sessions, attendance) lives in MongoDB. This file establishes that connection.
**How:** Uses Mongoose (a library that makes MongoDB easier to use) and the connection string from `.env`.

#### `server/middleware/authMiddleware.js` - "Are You Logged In?"
**What:** A security checkpoint that runs BEFORE any protected API request.
**Why:** Without this, anyone could access the API without logging in.
**How:** Reads the `Authorization: Bearer <token>` header from the request, verifies the JWT token using the secret key, and attaches the user's info (ID and role) to the request object. If the token is invalid or missing, it returns a 401 error.

#### `server/middleware/roleMiddleware.js` - "Are You Allowed To Do This?"
**What:** A second security checkpoint that checks the user's role.
**Why:** An admin shouldn't be able to mark attendance. A student shouldn't be able to create teachers. This middleware enforces those rules.
**How:** Takes a list of allowed roles (e.g., `"admin"`, `"teacher"`) and checks if the logged-in user's role matches. If not, it returns a 403 "Access denied" error.

#### `server/models/User.js` - Admin & Teacher Data Shape
**What:** Defines what an admin or teacher account looks like in the database.
**Fields:**
- `name` - Full name
- `email` - Unique email (used for login)
- `password_hash` - Encrypted password (never stored as plain text)
- `role` - Either `"admin"` or `"teacher"`
- `subject` - What the teacher teaches (e.g., "Mathematics")
- `class` - Which class they handle (e.g., "A", "B", "C")
- `active` - Whether the account is enabled or deactivated
- `created_at` - When the account was created

**Why `password_hash` and not `password`?** Passwords should NEVER be stored as plain text. The system uses **bcrypt** to one-way encrypt the password. Even if someone hacks the database, they can't read the passwords.

**Why `select: false` on `password_hash`?** This means when you query users, the password hash is NOT included by default. You must explicitly ask for it (`.select("+password_hash")`). This prevents accidentally leaking passwords.

#### `server/models/Student.js` - Student Data Shape
**What:** Defines what a student account looks like in the database.
**Fields (in addition to common ones):**
- `roll_no` - Student's roll number
- `class` - Which class they belong to (e.g., "A")
- `face_embedding` - An array of exactly 128 numbers that mathematically represent the student's face. This is what the AI uses to recognise them.
- `face_registered` - Boolean flag indicating whether the student has completed face registration

**Why 128 numbers?** The `dlib` face recognition model converts any face photo into a 128-dimensional vector. Two faces from the same person will produce vectors that are mathematically "close" to each other (small Euclidean distance), while faces from different people produce vectors that are "far apart".

#### `server/models/Session.js` - Class Session Data Shape
**What:** Represents a class period that a teacher has opened.
**Fields:**
- `teacher_id` - Which teacher created this session
- `teacher_name` - Teacher's name (stored for quick display)
- `subject` - Subject being taught
- `class` - Which class this session is for
- `status` - Either `"open"` (students can mark attendance) or `"closed"` (session ended)
- `started_at` / `ended_at` - Timestamps

#### `server/models/Attendance.js` - Individual Attendance Record
**What:** Records that a specific student was present in a specific session.
**Fields:**
- `student_id` - Which student marked attendance
- `session_id` - In which session
- `teacher_id` - Under which teacher
- `class` / `subject` - For quick reporting
- `marked_at` - When the attendance was marked
- `method` - Always `"face"` (the only supported method)

**Important:** There's a unique index on `(student_id, session_id)` - this means a student can only mark attendance ONCE per session. Even if they try to submit multiple times, the database will reject duplicates.

#### `server/routes/adminRoutes.js` - Admin API Endpoints
**What it handles:**
1. **POST `/api/admin/login`** - Admin logs in with email + password, gets a JWT token
2. **POST `/api/admin/teachers`** - Admin creates a new teacher account
3. **GET `/api/admin/teachers`** - Admin fetches list of all teachers
4. **PATCH `/api/admin/teachers/:id`** - Admin deactivates a teacher

**How login works:**
1. Find the user by email
2. Check they have `role: "admin"` and `active: true`
3. Compare the submitted password against the stored hash using bcrypt
4. If everything matches, sign a JWT token (valid for 24 hours) and return it

#### `server/routes/teacherRoutes.js` - Teacher API Endpoints
**What it handles:**
1. **POST `/api/teacher/login`** - Teacher logs in, gets a JWT token

Works identically to admin login, but checks `role: "teacher"`.

#### `server/routes/studentRoutes.js` - Student API Endpoints (the most complex)
**What it handles:**
1. **POST `/api/student/register`** - Student creates an account (with roll number, class, etc.)
2. **POST `/api/student/login`** - Student logs in (only if face is registered)
3. **POST `/api/student/face/register`** - Sends webcam photo to Python service, registers face embedding
4. **POST `/api/student/face/verify`** - Sends webcam photo for attendance verification
5. **GET `/api/student/attendance/mine`** - Get the student's own attendance history
6. **GET `/api/students/class/:class`** - Teacher gets count of students in a class

**How face verification works (the core flow):**
1. Student sends a webcam photo (base64-encoded JPEG)
2. Server checks that the student has a registered face
3. Server finds an open session for the student's class
4. Server checks that attendance isn't already marked for this session
5. Server calls the **Python service** at `/verify` with the photo and class name
6. Python service compares the live face against ALL stored faces in that class
7. If a match is found (distance < 0.5), the Python service returns the matched student's ID
8. The Node.js server **double-checks** that the matched ID equals the logged-in student's ID
9. If everything passes, attendance is saved
10. The teacher is notified in real time via WebSocket

#### `server/routes/sessionRoutes.js` - Session Management API
**What it handles:**
1. **POST `/api/sessions/start`** - Teacher starts a new session
2. **GET `/api/sessions/mine`** - Teacher gets all their sessions (with attendance counts)
3. **GET `/api/sessions/active/:class`** - Student checks if there's an active session for their class
4. **GET `/api/sessions/:id/attendance`** - Teacher views who marked attendance in a session
5. **PATCH `/api/sessions/:id/end`** - Teacher ends a session

**Guards against abuse:**
- A teacher cannot have two sessions open simultaneously
- Two different teachers cannot open sessions for the same class at the same time
- Only the teacher who created a session can end it

#### `server/socket/socketHandler.js` - Real-Time Events
**What:** Manages WebSocket connections for real-time updates.
**Events:**
- `join-class` - When a student opens their dashboard, they join a "room" named after their class (e.g., `class-A`). Any events sent to this room will reach all students in that class.
- `join-teacher` - Teachers join a room named after their ID (e.g., `teacher-abc123`)
- `session:opened` - Broadcast to all students in a class when a teacher starts a session
- `session:closed` - Broadcast when a session ends
- `attendance:marked` - Sent to the teacher when a student marks attendance (with live count)



### 2. `client/` - The Frontend UI

This is what users see and interact with in their web browser. It's built with **React** (a JavaScript library for building user interfaces) and bundled by **Vite** (a fast build tool).

#### `client/index.html` - The One and Only HTML Page
**What:** The single HTML file for the entire application. React renders all content dynamically inside the `<div id="root">` element.
**Why only one HTML page?** This is a **Single Page Application (SPA)**. Instead of loading a new HTML page for every click, React dynamically swaps content in and out. The browser URL changes (thanks to React Router), but no full page reload happens - making it feel instant.

#### `client/vite.config.js` - Build Tool Config
**What:** Configures Vite (the tool that bundles and serves the React code).
**What it does:** Sets the development server port to 5173 and enables the React plugin.

#### `client/src/main.jsx` - The App's Entry Point
**What:** The very first JavaScript that runs. It defines all the top-level routes:
- `/admin/*` → Admin portal
- `/teacher/*` → Teacher portal
- `/student/*` → Student portal
- `/` → Redirects to `/student/login`

**Why separate portals?** Each user type has a completely different interface and different permissions. Separating them keeps the code clean and prevents one user type from accidentally seeing another's interface.

#### `client/src/global.css` - Shared Styles (458 lines)
**What:** The main stylesheet that defines the visual design for the entire app - colors, fonts, layout, buttons, form inputs, tables, cards, badges, loading spinners, and responsive breakpoints.

#### `client/src/components/` - Reusable Building Blocks

##### `Loader.jsx` - Loading Spinner
**What:** A simple spinning animation with a label (e.g., "Loading dashboard"). Used everywhere while data is being fetched from the server.

##### `ProtectedRoute.jsx` - Login Guard
**What:** Wraps any page that requires login. If the user is not logged in (no token in localStorage), they are automatically redirected to the login page.
**How:** Checks `localStorage` for a saved token and user object. Also verifies that the user's role matches the required role (e.g., a student token can't access the admin dashboard).

##### `WebcamCapture.jsx` - Camera + Face Detection + Capture (193 lines)
**What:** The core camera component used for both face registration and attendance marking.
**How it works:**
1. Requests camera permission using `navigator.mediaDevices.getUserMedia()`
2. Shows a live video feed with an oval overlay
3. Runs **MediaPipe face detection** every 180ms in the background:
   - Draws a bounding box around detected faces
   - Draws blue landmark dots on facial features
   - Shows guidance messages ("Centre your face", "Move closer", etc.)
4. When the user clicks "Capture":
   - Validates the face position (centred? correct size? single face?)
   - Draws the video frame onto a hidden `<canvas>`
   - Converts the canvas to a base64-encoded JPEG
   - Calls the parent's `onCapture` function with the image data

#### `client/src/utils/` - Helper Functions

##### `api.js` - HTTP Client
**What:** A configured Axios instance that all frontend code uses to talk to the backend.
**Features:**
- Automatically prepends the base API URL
- Automatically attaches the JWT token to every request
- If the server returns 401 (unauthorised), automatically logs the user out and redirects to login

##### `auth.js` - Login/Logout Management
**What:** Functions to save, retrieve, and clear authentication tokens from `localStorage`.
**Why role-scoped keys?** Each role (admin, teacher, student) has its own localStorage key (e.g., `attendance_token_admin`, `attendance_token_teacher`). This means you can be logged into the admin panel and teacher panel simultaneously in the same browser without conflicts.

##### `faceValidation.js` - Browser-Side Face Detection (162 lines)
**What:** Uses **Google MediaPipe** to detect and validate faces IN THE BROWSER (before sending anything to the server).
**Why validate in the browser?** Sending a photo to the server, processing it, and getting back "no face detected" wastes time and bandwidth. By checking in the browser first, we give instant feedback.
**What it checks:**
1. Is exactly ONE face visible? (rejects zero or multiple faces)
2. Is the face centred? (within 20% of the frame centre)
3. Is the face the right size? (between 8% and 50% of the frame area)
4. Are face landmarks valid? (at least 100 landmark points detected)

#### `client/src/portals/admin/` - Admin Dashboard

##### `AdminApp.jsx` - Admin Routes
Defines two routes: `/admin/login` (public) and `/admin` (protected dashboard).

##### `LoginPage.jsx` - Admin Login Form
Email/password form → calls `POST /api/admin/login` → saves token → redirects to dashboard.

##### `Dashboard.jsx` - The Admin Main Screen
Layout with a sidebar ("Attendance Admin") and main content area. Shows:
- The **Create Teacher** form
- A **list of all teachers** with status and deactivation buttons

##### `CreateTeacher.jsx` - Teacher Creation Form
Form with fields: name, email, password, subject, class (dropdown of A through D). On submit, calls `POST /api/admin/teachers`.

##### `TeacherList.jsx` - Teacher Table
Displays all teachers in a table with columns: name, email, subject, class, status (Active/Inactive badge), created date, and a "Deactivate" button.

#### `client/src/portals/teacher/` - Teacher Dashboard

##### `TeacherApp.jsx` - Teacher Routes
Two routes: `/teacher/login` (public) and `/teacher` (protected dashboard).

##### `LoginPage.jsx` - Teacher Login Form
Same pattern as admin login, calls `POST /api/teacher/login`.

##### `Dashboard.jsx` - The Teacher Main Screen (169 lines)
The most interactive page. Shows:
- **Stats:** Total students enrolled, present count, total sessions taken
- **Session Control:** Start/end session buttons with live attendance count
- **Session History:** Table of all past sessions

**Real-time updates:**
Connects to WebSocket on mount. Joins the `teacher-{id}` room. When a student marks attendance, the `attendance:marked` event fires and the present count updates live on screen.

##### `SessionControl.jsx` - Session Start/End UI
Shows either:
- A "Start Session" button (when no session is active)
- An active session card with subject, class, start time, live count, and "End Session" button

##### `ScheduleSession.jsx` - Start Session Button
Simple component showing the teacher's subject and class with a "Start Session" button.

##### `AttendanceView.jsx` - Session History Table
Table showing all past sessions: date, subject, class, total marked, duration, and status.

#### `client/src/portals/student/` - Student Dashboard

##### `StudentApp.jsx` - Student Routes
Routes: `/student/login`, `/student/register`, `/student/register/face`, `/student` (dashboard), `/student/history`.

##### `RegisterPage.jsx` - Student Registration Form (Step 1 of 2)
Two-step registration with a progress indicator (dots and line). Form fields: name, email, password, confirm password, roll number, class. On submit, the server creates the account and returns a temporary token. The user is redirected to step 2.

##### `FaceScanRegister.jsx` - Face Registration (Step 2 of 2)
Shows the `WebcamCapture` component. When the student captures their face, it calls `POST /api/student/face/register` with the base64 image and student ID. The server forwards this to the Python service, which extracts the 128-number face embedding and saves it.

##### `LoginPage.jsx` - Student Login
Standard email/password form. **Important:** Login is blocked if the student hasn't completed face registration.

##### `Dashboard.jsx` - The Student Main Screen
Shows:
- Active session card (or "No active session" message)
- **Mark Attendance** section
- **Attendance History** table

**Real-time updates:**
Connects to WebSocket, joins the `class-{className}` room. Receives `session:opened` and `session:closed` events so the UI updates instantly when a teacher starts/ends a session.

##### `MarkAttendance.jsx` - Face Scan for Attendance
Shows a "Mark Attendance" button (disabled when no session is active or already marked). When clicked, opens the `WebcamCapture`. On capture, calls `POST /api/student/face/verify`. On success, shows "Attendance marked successfully".

##### `AttendanceHistory.jsx` - Past Records Table
Displays a table with columns: date, subject, teacher, status (Present/Absent badge), and marked time. Can be shown inline on the dashboard or as a standalone page at `/student/history`.



### 3. `python-service/` - The Face Recognition AI

This is a separate Python server that handles the computationally expensive face recognition work. It's separated from the Node.js server because Python's `face_recognition` library (which uses `dlib`'s deep learning model) runs best in Python.

#### `python-service/main.py` - FastAPI Server
**What:** Defines three API endpoints:
- **GET `/health`** - Returns `{"status": "ok"}` (used to check if the service is running)
- **POST `/register`** - Receives a base64 webcam photo + student ID, extracts face embedding, saves to database
- **POST `/verify`** - Receives a base64 webcam photo + class name, compares against all stored faces in that class

#### `python-service/face_utils.py` - Core AI Logic (182 lines)
**What:** The heart of the face recognition system.

##### `_decode_frame(base64_frame)`
Converts a base64-encoded image string into a NumPy array (RGB pixel data) that OpenCV and face_recognition can work with. Also resizes to 640×480 for consistency.

##### `_face_location_from_frame(rgb_image)`
Uses the HOG (Histogram of Oriented Gradients) model to find face locations in the image. Returns an error if zero or multiple faces are found.

##### `_encode_single_face(base64_frame)`
Combines decoding and location detection, then generates the 128-dimensional face embedding using dlib's pre-trained deep learning model.

##### `register_face(base64_frame, student_id)`
1. Extracts face embedding from the photo
2. Saves the 128-number array to the student's document in MongoDB
3. Sets `face_registered: True`

##### `verify_face(base64_frame, class_name)`
1. Extracts face embedding from the live photo
2. Fetches ALL registered face embeddings from the database for that class
3. Calculates the **Euclidean distance** between the live embedding and each stored embedding
4. If the closest match has distance < 0.5, returns `matched: True` with the student's ID
5. The distance threshold of 0.5 is the industry standard for face_recognition library - below 0.5 means the faces are likely the same person

#### `python-service/requirements.txt` - Python Dependencies
- `fastapi` - The web framework
- `uvicorn` - The ASGI server (runs FastAPI)
- `opencv-python` - Image processing (decoding, resizing, colour conversion)
- `mediapipe` - Alternative face detection (used in browser, listed here as optional dependency)
- `face_recognition` - The main AI library (wraps dlib's deep learning model)
- `numpy` - Mathematical array operations
- `pymongo` - Direct MongoDB access from Python
- `setuptools` - Build dependency

#### `python-service/Dockerfile` - Container Config
Installs system-level dependencies needed to compile dlib (build-essential, cmake, OpenBLAS, LAPACK), then pip installs Python packages, and starts uvicorn.



### 4. Root Config Files

#### `.gitignore` - What Git Should Ignore
Excludes: `node_modules/` (too many files), `.venv/` (Python virtual environment), `.env` files (contain secrets), `dist/` (build output), `__pycache__/` (Python cache).

#### `render.yaml` - Render Deployment Blueprint
Defines all 3 services for one-click deployment:
1. **attendance-server** - Node.js Docker web service on port 5001
2. **attendance-python** - Python Docker web service on port 8000
3. **attendance-client** - Static site (React build) with SPA rewrite rules

Uses `fromService` to automatically wire URLs between services (e.g., the server knows the Python service's URL, the client knows the server's URL).



## Database Schema

The project uses **MongoDB** with 4 collections:

```
┌──────────────────────────────────────────────────────┐
│  Collection: users                                    │
│  Purpose: Admin and Teacher accounts                  │
├──────────────────────────────────────────────────────┤
│  _id           │  ObjectId (auto-generated)           │
│  name          │  "Dr. Sharma"                        │
│  email         │  "sharma@school.com"                 │
│  password_hash │  "$2a$10$..." (bcrypt hash)          │
│  role          │  "admin" | "teacher"                 │
│  subject       │  "Mathematics" (teachers only)       │
│  class         │  "A" (teachers only)              │
│  active        │  true | false                        │
│  created_at    │  2026-04-23T10:00:00Z                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Collection: students                                 │
│  Purpose: Student accounts with face data             │
├──────────────────────────────────────────────────────┤
│  _id            │  ObjectId                           │
│  name           │  "Rahul Verma"                      │
│  email          │  "rahul@student.com"                 │
│  password_hash  │  "$2a$10$..."                       │
│  roll_no        │  "42"                               │
│  class          │  "A"                             │
│  face_embedding │  [0.023, -0.112, ...] (128 floats)  │
│  face_registered│  true | false                       │
│  registered_at  │  2026-04-23T10:05:00Z               │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Collection: sessions                                 │
│  Purpose: Class periods opened by teachers            │
├──────────────────────────────────────────────────────┤
│  _id           │  ObjectId                            │
│  teacher_id    │  ObjectId (→ users)                  │
│  teacher_name  │  "Dr. Sharma"                        │
│  subject       │  "Mathematics"                       │
│  class         │  "A"                              │
│  status        │  "open" | "closed"                   │
│  started_at    │  2026-04-23T11:00:00Z                │
│  ended_at      │  2026-04-23T11:45:00Z | null         │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Collection: attendance                               │
│  Purpose: Individual attendance records               │
├──────────────────────────────────────────────────────┤
│  _id           │  ObjectId                            │
│  student_id    │  ObjectId (→ students)               │
│  session_id    │  ObjectId (→ sessions)               │
│  teacher_id    │  ObjectId (→ users)                  │
│  class         │  "A"                              │
│  subject       │  "Mathematics"                       │
│  marked_at     │  2026-04-23T11:05:23Z                │
│  method        │  "face"                              │
│  UNIQUE INDEX  │  (student_id + session_id)           │
└──────────────────────────────────────────────────────┘
```



## API Endpoints

### Admin Routes (`/api/admin`)
| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/login` | ❌ | Admin login |
| POST | `/teachers` | ✅ Admin | Create a teacher |
| GET | `/teachers` | ✅ Admin | List all teachers |
| PATCH | `/teachers/:id` | ✅ Admin | Deactivate a teacher |

### Teacher Routes (`/api/teacher`)
| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/login` | ❌ | Teacher login |

### Student Routes (`/api/student`)
| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/register` | ❌ | Create a student account |
| POST | `/login` | ❌ | Student login |
| POST | `/face/register` | ✅ Student | Register face embedding |
| POST | `/face/verify` | ✅ Student | Verify face for attendance |
| GET | `/attendance/mine` | ✅ Student | Get own attendance history |

### Session Routes (`/api/sessions`)
| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/start` | ✅ Teacher | Start a session |
| GET | `/mine` | ✅ Teacher | Get all my sessions |
| GET | `/active/:class` | ✅ Student | Check for active session |
| GET | `/:id/attendance` | ✅ Teacher | View attendance for a session |
| PATCH | `/:id/end` | ✅ Teacher | End a session |

### Python Service Routes (`:8000`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/register` | Extract and save face embedding |
| POST | `/verify` | Compare live face against stored faces |



## Real-Time Features (WebSocket)

| Event | Direction | Who receives | Triggered when |
|-------|-----------|-------------|----------------|
| `join-class` | Client → Server | - | Student opens dashboard |
| `join-teacher` | Client → Server | - | Teacher opens dashboard |
| `session:opened` | Server → Clients | All students in the class | Teacher starts a session |
| `session:closed` | Server → Clients | All students in the class | Teacher ends a session |
| `attendance:marked` | Server → Client | The session's teacher | A student successfully marks attendance |



## Security Features

| Feature | Implementation |
|---------|---------------|
| **Password hashing** | bcrypt with 10 salt rounds - passwords are never stored in plain text |
| **JWT authentication** | 24-hour expiring tokens, verified on every protected API call |
| **Role-based access** | Middleware checks if user has the correct role before allowing access |
| **Double verification** | Server verifies that the face-matched student ID matches the logged-in user |
| **CORS protection** | Only the configured client URL can make API requests |
| **Password exclusion** | `password_hash` is excluded from all API responses by default |
| **Face embedding exclusion** | `face_embedding` is excluded from student profile responses |
| **Duplicate prevention** | Unique database index prevents marking attendance twice for the same session |
| **Session conflicts** | Guards prevent multiple simultaneous sessions for the same class |



## User Flows

### Student Registration Flow
```
Register Page (/student/register)
       │
       ▼  Fill form (name, email, password, roll, class)
       │
       ▼  POST /api/student/register → Account created
       │
   Face Scan Page (/student/register/face)
       │
       ▼  Webcam opens, MediaPipe validates face position
       │
       ▼  Student clicks "Capture"
       │
       ▼  POST /api/student/face/register → Python service
       │     → Extracts 128-D face embedding
       │     → Saves to MongoDB
       │
       ▼  Redirect to Login Page (/student/login)
```

### Attendance Marking Flow
```
Student Dashboard (/student)
       │
       ▼  WebSocket: Receives "session:opened" → UI shows active session
       │
       ▼  Student clicks "Mark Attendance"
       │
       ▼  Webcam opens, student captures face
       │
       ▼  POST /api/student/face/verify
       │     → Server calls Python service /verify
       │     → Python compares live face against ALL faces in class
       │     → Returns closest match student_id + distance
       │     → Server verifies matched_id == logged_in_id
       │     → Server verifies distance < 0.5
       │     → Attendance saved to database
       │
       ▼  WebSocket: Teacher receives "attendance:marked" → Live count updates
       │
       ▼  UI shows "Attendance Marked ✓"
```



## Setup & Running Locally

### Prerequisites
- Node.js 18+ (via Homebrew: `brew install node`)
- Python 3.11+ (via Homebrew: `brew install python@3.13`)
- MongoDB Atlas account (free cluster)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/aryan-2255/attendance_system.git
cd attendance_system

# 2. Install server dependencies
cd server
npm install
cd ..

# 3. Install client dependencies
cd client
npm install
cd ..

# 4. Set up Python virtual environment
cd python-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# 5. Configure environment variables (see section below)

# 6. Start all 3 services (in separate terminals)

# Terminal 1 - Backend Server
cd server && npm start

# Terminal 2 - Frontend Client
cd client && npm run dev

# Terminal 3 - Python Face Service
cd python-service && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Access URLs
| Service | URL |
|---------|-----|
| Client (Browser) | http://localhost:5173 |
| Server API | http://localhost:5001 |
| Python Service | http://localhost:8000 |
| FastAPI Docs | http://localhost:8000/docs |



## Deployment (Render)

This project is **Render-ready** with a `render.yaml` Blueprint at the repository root.

### One-Click Deploy
1. Push the code to GitHub
2. Go to [render.com/deploy](https://render.com/deploy)
3. Connect your repository
4. Render auto-detects `render.yaml` and creates all 3 services
5. Enter the two secrets when prompted (MONGO_URI and ADMIN_PASSWORD)
6. Done - all services are live with auto-wired URLs



## Default Credentials

| Portal | Email | Password |
|--------|-------|----------|
| Admin | `admin@school.com` | `Admin@1234` |
| Teacher | *(created by admin)* | *(set by admin)* |
| Student | *(self-registered)* | *(set at registration)* |



## Environment Variables

### `server/.env`
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `any-long-random-string` |
| `ADMIN_EMAIL` | Default admin email | `admin@school.com` |
| `ADMIN_PASSWORD` | Default admin password | `Admin@1234` |
| `PYTHON_SERVICE_URL` | URL of the Python face service | `http://localhost:8000` |
| `CLIENT_URL` | URL of the React client (for CORS) | `http://localhost:5173` |

### `client/.env`
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Full backend API URL | `http://localhost:5001/api` |
| `VITE_SOCKET_URL` | Backend WebSocket URL | `http://localhost:5001` |

### `python-service/.env`
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | Same MongoDB connection string as server | `mongodb+srv://...` |



## Project Stats

| Metric | Value |
|--------|-------|
| Total source files | 40+ |
| Total lines of code | ~4,100 |
| Frontend components | 19 React components |
| API endpoints | 14 REST endpoints |
| Database collections | 4 |
| AI model | dlib's 128-D face encoding |
| Real-time events | 5 WebSocket event types |
| Supported classes | A, B, C, D |
