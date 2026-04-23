import { Navigate } from "react-router-dom";

import { getToken, getUser, loginPathForRole } from "../utils/auth";

const ProtectedRoute = ({ role, children }) => {
  const token = getToken(role);
  const user = getUser(role);

  if (!token || !user) {
    return <Navigate to={loginPathForRole(role)} replace />;
  }

  if (user.role !== role) {
    return <Navigate to={loginPathForRole(role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
