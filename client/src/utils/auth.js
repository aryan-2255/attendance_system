const LEGACY_TOKEN_KEY = "attendance_token";
const LEGACY_USER_KEY = "attendance_user";
const ROLES = ["admin", "teacher", "student"];

const getPathRole = () => {
  if (typeof window === "undefined") {
    return "student";
  }

  const role = window.location.pathname.split("/")[1];
  return ROLES.includes(role) ? role : "student";
};

const resolveRole = (role) => {
  if (ROLES.includes(role)) {
    return role;
  }

  return getPathRole();
};

const tokenKeyForRole = (role) => `attendance_token_${resolveRole(role)}`;
const userKeyForRole = (role) => `attendance_user_${resolveRole(role)}`;

export const saveAuth = (token, user) => {
  const role = resolveRole(user?.role);
  localStorage.setItem(tokenKeyForRole(role), token);
  localStorage.setItem(userKeyForRole(role), JSON.stringify(user));
};

export const getToken = (role) => {
  return localStorage.getItem(tokenKeyForRole(role)) || localStorage.getItem(LEGACY_TOKEN_KEY);
};

export const getUser = (role) => {
  const raw = localStorage.getItem(userKeyForRole(role)) || localStorage.getItem(LEGACY_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAuth = (role) => {
  if (ROLES.includes(role)) {
    localStorage.removeItem(tokenKeyForRole(role));
    localStorage.removeItem(userKeyForRole(role));
  } else {
    ROLES.forEach((name) => {
      localStorage.removeItem(tokenKeyForRole(name));
      localStorage.removeItem(userKeyForRole(name));
    });
  }

  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const logout = (role) => {
  clearAuth(role);
  window.location.href = `/${role}/login`;
};

export const loginPathForRole = (role) => {
  if (role === "admin" || role === "teacher" || role === "student") {
    return `/${role}/login`;
  }

  return "/student/login";
};
