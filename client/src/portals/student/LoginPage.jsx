import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../utils/api";
import { saveAuth } from "../../utils/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/student/login", form);
      saveAuth(data.token, data.user);
      navigate("/student");
    } catch (err) {
      setError(err.response?.data?.error || "Student login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page student-auth">
      <section className="card auth-card">
        <h1 className="auth-title">Student Login</h1>
        <p className="auth-copy">Sign in to view active sessions and mark attendance.</p>
        <form className="form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="student-login-email">Email</label>
            <input
              id="student-login-email"
              className="input"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="student-login-password">Password</label>
            <input
              id="student-login-password"
              className="input"
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              required
            />
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="portal-switch">
          New student: <Link to="/student/register">Create account</Link>
        </p>
      </section>
    </main>
  );
};

export default LoginPage;
