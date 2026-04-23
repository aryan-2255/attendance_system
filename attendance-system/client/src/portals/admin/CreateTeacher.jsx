import { useState } from "react";

import api from "../../utils/api";

const CLASS_OPTIONS = ["10-A", "10-B", "11-A", "11-B", "12-A", "12-B"];

const initialForm = {
  name: "",
  email: "",
  password: "",
  subject: "",
  class: "10-A"
};

const CreateTeacher = ({ onCreated }) => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/admin/teachers", form);
      setForm(initialForm);
      setSuccess("Teacher account created");
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create teacher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card create-teacher-card">
      <div className="section-heading">
        <h2>Create Teacher</h2>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="form-field">
          <label htmlFor="teacher-name">Full name</label>
          <input
            id="teacher-name"
            className="input"
            name="name"
            value={form.name}
            onChange={updateField}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="teacher-email">Email</label>
          <input
            id="teacher-email"
            className="input"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="teacher-password">Password</label>
          <input
            id="teacher-password"
            className="input"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            required
          />
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="teacher-subject">Subject</label>
            <input
              id="teacher-subject"
              className="input"
              name="subject"
              value={form.subject}
              onChange={updateField}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="teacher-class">Class</label>
            <select
              id="teacher-class"
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
        {success ? <p className="form-success">{success}</p> : null}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create teacher"}
        </button>
      </form>
    </section>
  );
};

export default CreateTeacher;
