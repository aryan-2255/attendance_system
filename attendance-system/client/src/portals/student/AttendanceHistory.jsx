import { useEffect, useState } from "react";

import Loader from "../../components/Loader";
import api from "../../utils/api";
import { getUser, logout } from "../../utils/auth";

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const AttendanceHistory = ({ history = [], standalone = false }) => {
  const user = getUser();
  const [standaloneHistory, setStandaloneHistory] = useState([]);
  const [loading, setLoading] = useState(standalone);
  const [error, setError] = useState("");
  const visibleHistory = standalone ? standaloneHistory : history;

  useEffect(() => {
    if (!standalone) {
      return;
    }

    const loadHistory = async () => {
      try {
        const { data } = await api.get("/student/attendance/mine");
        setStandaloneHistory(data.history || []);
      } catch (err) {
        setError(err.response?.data?.error || "Could not load attendance history");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [standalone]);

  const content = (
    <section className="card history-card">
      <div className="section-heading">
        <h2>Attendance History</h2>
        <span>{visibleHistory.length} records</span>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? (
        <Loader label="Loading history" />
      ) : visibleHistory.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Status</th>
              <th>Marked at</th>
            </tr>
          </thead>
          <tbody>
            {visibleHistory.map((item) => (
              <tr key={item.session_id}>
                <td>{formatDate(item.date)}</td>
                <td>{item.subject}</td>
                <td>{item.teacher_name}</td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "Present" ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>{item.marked_at ? formatDate(item.marked_at) : "Not marked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">No attendance history yet.</div>
      )}
    </section>
  );

  if (!standalone) {
    return content;
  }

  return (
    <div className="student-dashboard">
      <header className="student-topbar">
        <div>
          <h1>Attendance History</h1>
          <p>{user?.email}</p>
        </div>
        <button className="btn-muted" type="button" onClick={() => logout("student")}>
          Logout
        </button>
      </header>
      <main className="student-main">{content}</main>
    </div>
  );
};

export default AttendanceHistory;
