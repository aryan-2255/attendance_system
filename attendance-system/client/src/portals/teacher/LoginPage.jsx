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
      const { data } = await api.post("/teacher/login", form);
      saveAuth(data.token, data.user);
      navigate("/teacher");
    } catch (err) {
      setError(err.response?.data?.error || "Teacher login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page teacher-auth">
      <section className="card auth-card">
        <h1 className="auth-title">Teacher Login</h1>
        <p className="auth-copy">Sign in to control class sessions and review attendance.</p>
        <form className="form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="teacher-login-email">Email</label>
            <input
              id="teacher-login-email"
              className="input"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="teacher-login-password">Password</label>
            <input
              id="teacher-login-password"
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
          Student portal: <Link to="/student/login">Open login</Link>
        </p>
      </section>
    </main>
  );
};

export default LoginPage;
