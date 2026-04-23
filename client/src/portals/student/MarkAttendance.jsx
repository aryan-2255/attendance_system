import { useState } from "react";

import WebcamCapture from "../../components/WebcamCapture";
import api from "../../utils/api";

const MarkAttendance = ({ activeSession, alreadyMarked, onMarked }) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canMark = Boolean(activeSession) && !alreadyMarked;

  const verifyFace = async (frame) => {
    if (!activeSession) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/student/face/verify", {
        base64_frame: frame,
        session_id: activeSession._id
      });
      setSuccess("Attendance marked successfully");
      setScannerOpen(false);
      await onMarked();
    } catch (err) {
      setError(err.response?.data?.error || "Face verification failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card mark-card">
      <div className="section-heading">
        <h2>Mark Attendance</h2>
        {alreadyMarked ? <span className="badge badge-success">Present</span> : null}
      </div>
      {!scannerOpen ? (
        <div className="mark-row">
          <p className="muted-text">
            {canMark
              ? "Use face scan to mark attendance for the active session."
              : alreadyMarked
              ? "Attendance is already marked for this session."
              : "The button unlocks when your teacher opens a session."}
          </p>
          <button
            className="btn-primary"
            type="button"
            disabled={!canMark}
            onClick={() => setScannerOpen(true)}
          >
            Mark Attendance
          </button>
        </div>
      ) : (
        <WebcamCapture
          buttonText="Scan Face"
          disabled={!canMark}
          loading={loading}
          onCapture={verifyFace}
          requireValidation={false}
          status="Match threshold is enforced by the server."
        />
      )}
      {error ? <p className="form-error center-text">{error}</p> : null}
      {success ? <p className="form-success center-text">{success}</p> : null}
    </section>
  );
};

export default MarkAttendance;
