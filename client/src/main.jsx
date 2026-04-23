import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AdminApp from "./portals/admin/AdminApp";
import TeacherApp from "./portals/teacher/TeacherApp";
import StudentApp from "./portals/student/StudentApp";
import "./global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/student/login" replace />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/teacher/*" element={<TeacherApp />} />
        <Route path="/student/*" element={<StudentApp />} />
        <Route path="*" element={<div className="state-page">Not found</div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
