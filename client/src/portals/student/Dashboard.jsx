import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import Loader from "../../components/Loader";
import api from "../../utils/api";
import { getUser, logout } from "../../utils/auth";
import AttendanceHistory from "./AttendanceHistory";
import MarkAttendance from "./MarkAttendance";

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
const socketUrl = rawSocketUrl.startsWith("http") ? rawSocketUrl : `https://${rawSocketUrl}`;

const Dashboard = () => {
  const user = getUser();
  const socketRef = useRef(null);
  const [activeSession, setActiveSession] = useState(null);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      const [activeResponse, historyResponse] = await Promise.all([
        api.get(`/sessions/active/${encodeURIComponent(user.class)}`),
        api.get("/student/attendance/mine")
      ]);

      setActiveSession(activeResponse.data.active ? activeResponse.data.session : null);
      setAlreadyMarked(activeResponse.data.already_marked || false);
      setHistory(historyResponse.data.history || []);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load student dashboard");
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
      socket.emit("join-class", { class: user.class });
    });

    socket.on("session:opened", (payload) => {
      setActiveSession({
        _id: payload.session_id,
        teacher_name: payload.teacher_name,
        subject: payload.subject,
        class: user.class,
        started_at: payload.started_at,
        status: "open"
      });
      setAlreadyMarked(false);
      setNotice("Session opened");
    });

    socket.on("session:closed", (payload) => {
      setActiveSession((current) => {
        if (!current || String(current._id) === String(payload.session_id)) {
          return null;
        }

        return current;
      });
      setNotice("Session ended");
      loadDashboard();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadDashboard, user.class]);

  const handleMarked = async () => {
    setAlreadyMarked(true);
    setNotice("Attendance marked");
    await loadDashboard();
  };

  return (
    <div className="student-dashboard">
      <header className="student-topbar">
        <div>
          <h1>{user.name}</h1>
          <p>
            Roll {user.roll_no}, class {user.class}
          </p>
        </div>
        <button className="btn-muted" type="button" onClick={() => logout("student")}>
          Logout
        </button>
      </header>

      {loading ? (
        <Loader label="Loading dashboard" />
      ) : (
        <main className="student-main">
          {error ? <p className="form-error">{error}</p> : null}
          {notice ? <p className="student-notice">{notice}</p> : null}
          <section className={`card active-session-card ${activeSession ? "is-open" : "is-closed"}`}>
            <div>
              <span className="session-label">Active session</span>
              <h2>{activeSession ? activeSession.subject : "No active session"}</h2>
              <p>
                {activeSession
                  ? `${activeSession.teacher_name}, started ${new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(new Date(activeSession.started_at))}`
                  : "Waiting for your teacher to start a class session"}
              </p>
            </div>
            <span className={`badge ${activeSession ? "badge-success" : "badge-warning"}`}>
              {activeSession ? "Open" : "Locked"}
            </span>
          </section>

          <MarkAttendance
            activeSession={activeSession}
            alreadyMarked={alreadyMarked}
            onMarked={handleMarked}
          />

          <AttendanceHistory history={history} />
        </main>
      )}
    </div>
  );
};

export default Dashboard;
