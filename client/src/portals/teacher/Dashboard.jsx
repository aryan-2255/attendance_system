import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import Loader from "../../components/Loader";
import api from "../../utils/api";
import { getUser, logout } from "../../utils/auth";
import AttendanceView from "./AttendanceView";
import SessionControl from "./SessionControl";

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
const socketUrl = rawSocketUrl.startsWith("http") ? rawSocketUrl : `https://${rawSocketUrl}`;

const Dashboard = () => {
  const user = getUser();
  const socketRef = useRef(null);
  const [studentCount, setStudentCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [presentCount, setPresentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentOrLastPresent = useMemo(() => {
    if (activeSession) {
      return presentCount;
    }

    return sessions[0]?.total_marked || 0;
  }, [activeSession, presentCount, sessions]);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      const [sessionsResponse, studentsResponse] = await Promise.all([
        api.get("/sessions/mine"),
        api.get(`/students/class/${encodeURIComponent(user.class)}`)
      ]);

      const loadedSessions = sessionsResponse.data.sessions || [];
      const openSession = loadedSessions.find((session) => session.status === "open") || null;
      setSessions(loadedSessions);
      setActiveSession(openSession);
      setPresentCount(openSession?.total_marked || loadedSessions[0]?.total_marked || 0);
      setStudentCount(studentsResponse.data.count || 0);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load teacher dashboard");
    } finally {
      setLoading(false);
    }
  }, [user.class]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const socket = io(socketUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-teacher", { teacherId: user._id });
    });

    socket.on("attendance:marked", (payload) => {
      setPresentCount(payload.total_marked || 0);
      setActiveSession((current) => {
        if (!current || String(current._id) !== String(payload.session_id)) {
          return current;
        }

        return { ...current, total_marked: payload.total_marked || 0 };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user._id]);

  const startSession = async () => {
    try {
      setError("");
      const { data } = await api.post("/sessions/start");
      setActiveSession(data.session);
      setPresentCount(0);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || "Could not start session");
    }
  };

  const endSession = async () => {
    if (!activeSession) {
      return;
    }

    try {
      setError("");
      await api.patch(`/sessions/${activeSession._id}/end`);
      setActiveSession(null);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || "Could not end session");
    }
  };

  return (
    <div className="layout teacher-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Teacher Portal</div>
        <nav className="sidebar-nav">
          <span className="sidebar-link">Dashboard</span>
          <span>{user.subject}</span>
          <span>Class {user.class}</span>
        </nav>
        <div className="sidebar-footer">
          <button className="btn-muted" type="button" onClick={() => logout("teacher")}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">{user.name}</h1>
            <p className="page-subtitle">
              {user.subject} for class {user.class}
            </p>
          </div>
        </header>

        {loading ? (
          <Loader label="Loading dashboard" />
        ) : (
          <>
            {error ? <p className="form-error dashboard-error">{error}</p> : null}
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total students enrolled</span>
                <span className="stat-value">{studentCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Present in current or last session</span>
                <span className="stat-value">{currentOrLastPresent}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total sessions taken</span>
                <span className="stat-value">{sessions.length}</span>
              </div>
            </section>

            <SessionControl
              activeSession={activeSession}
              presentCount={presentCount}
              studentCount={studentCount}
              user={user}
              onStart={startSession}
              onEnd={endSession}
            />

            <AttendanceView sessions={sessions} />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
