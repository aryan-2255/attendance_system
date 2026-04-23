import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "../../components/ProtectedRoute";
import Dashboard from "./Dashboard";
import LoginPage from "./LoginPage";
import "./admin.css";

const AdminApp = () => {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        index
        element={
          <ProtectedRoute role="admin">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<div className="state-page">Not found</div>} />
    </Routes>
  );
};

export default AdminApp;
