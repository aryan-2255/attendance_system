import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "../../components/ProtectedRoute";
import AttendanceHistory from "./AttendanceHistory";
import Dashboard from "./Dashboard";
import FaceScanRegister from "./FaceScanRegister";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import "./student.css";

const StudentApp = () => {
  return (
    <Routes>
      <Route path="register" element={<RegisterPage />} />
      <Route path="register/face" element={<FaceScanRegister />} />
      <Route path="login" element={<LoginPage />} />
      <Route
        index
        element={
          <ProtectedRoute role="student">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="history"
        element={
          <ProtectedRoute role="student">
            <AttendanceHistory standalone />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<div className="state-page">Not found</div>} />
    </Routes>
  );
};

export default StudentApp;
