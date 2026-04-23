import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../utils/api";

const CLASS_OPTIONS = ["A", "B", "C", "D"];

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  roll_no: "",
  class: "A"
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/student/register", form);
      localStorage.setItem("pending_student_id", data.student_id);
      localStorage.setItem("pending_student_token", data.temp_token);
      navigate("/student/register/face", {
        state: {
          student_id: data.student_id,
          temp_token: data.temp_token
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="student-register-page">
      <section className="card register-card">
        <div className="steps">
          <span className="step-dot active" />
          <span className="step-line" />
          <span className="step-dot" />
        </div>
        <h1 className="auth-title">Student Registration</h1>
        <p className="auth-copy">Create your account before registering your face scan.</p>
        <form className="form" onSubmit={submit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="student-name">Full name</label>
              <input
                id="student-name"
                className="input"
                name="name"
                value={form.name}
                onChange={updateField}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="student-email">Email</label>
              <input
                id="student-email"
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="student-password">Password</label>
              <input
                id="student-password"
                className="input"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="student-confirm">Confirm password</label>
              <input
                id="student-confirm"
                className="input"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="student-roll">Roll number</label>
              <input
                id="student-roll"
                className="input"
                name="roll_no"
                value={form.roll_no}
                onChange={updateField}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="student-class">Class</label>
              <select
                id="student-class"
                className="input"
                name="class"
                value={form.class}
                onChange={updateField}
                required
              >
                {CLASS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Continue to face scan"}
          </button>
        </form>
        <p className="portal-switch">
          Already registered: <Link to="/student/login">Open login</Link>
        </p>
      </section>
    </main>
  );
};

export default RegisterPage;
