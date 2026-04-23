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
      const { data } = await api.post("/admin/login", form);
      saveAuth(data.token, data.user);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page admin-auth">
      <section className="card auth-card">
        <h1 className="auth-title">Admin Login</h1>
        <p className="auth-copy">Sign in to manage teacher accounts.</p>
        <form className="form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              className="input"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
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
          Teacher portal: <Link to="/teacher/login">Open login</Link>
        </p>
      </section>
    </main>
  );
};

export default LoginPage;
