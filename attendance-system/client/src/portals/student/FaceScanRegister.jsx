import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import WebcamCapture from "../../components/WebcamCapture";
import api from "../../utils/api";

const FaceScanRegister = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const studentId = location.state?.student_id || localStorage.getItem("pending_student_id");
  const tempToken = location.state?.temp_token || localStorage.getItem("pending_student_token");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const registerFace = async (frame) => {
    if (!studentId || !tempToken) {
      setError("Complete account registration before face scan");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post(
        "/student/face/register",
        { base64_frame: frame, student_id: studentId },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      localStorage.removeItem("pending_student_id");
      localStorage.removeItem("pending_student_token");
      setSuccess("Face registered successfully");
      navigate("/student/login");
    } catch (err) {
      setError(err.response?.data?.error || "Face registration failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="student-register-page">
      <section className="card face-register-card">
        <div className="steps">
          <span className="step-dot done" />
          <span className="step-line done" />
          <span className="step-dot active" />
        </div>
        <h1 className="auth-title">Face Scan</h1>
        <p className="auth-copy">Position your face inside the oval and capture one clear frame.</p>
        {!studentId || !tempToken ? (
          <div className="empty-state">
            Account registration is required first. <Link to="/student/register">Go back</Link>
          </div>
        ) : (
          <WebcamCapture
            buttonText="Capture and Register Face"
            loading={loading}
            onCapture={registerFace}
            status="Only the face embedding vector is stored."
          />
        )}
        {error ? <p className="form-error center-text">{error}</p> : null}
        {success ? <p className="form-success center-text">{success}</p> : null}
      </section>
    </main>
  );
};

export default FaceScanRegister;
