import { useEffect, useState } from "react";

import Loader from "../../components/Loader";
import api from "../../utils/api";
import { getUser, logout } from "../../utils/auth";
import CreateTeacher from "./CreateTeacher";
import TeacherList from "./TeacherList";

const Dashboard = () => {
  const user = getUser();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeachers = async () => {
    try {
      setError("");
      const { data } = await api.get("/admin/teachers");
      setTeachers(data.teachers || []);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const deactivateTeacher = async (teacherId) => {
    try {
      const { data } = await api.patch(`/admin/teachers/${teacherId}`);
      setTeachers((current) =>
        current.map((teacher) => (teacher._id === teacherId ? data.teacher : teacher))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Could not deactivate teacher");
    }
  };

  return (
    <div className="layout admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Attendance Admin</div>
        <nav className="sidebar-nav">
          <span className="sidebar-link">Teachers</span>
        </nav>
        <div className="sidebar-footer">
          <button className="btn-muted" type="button" onClick={() => logout("admin")}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Teacher Management</h1>
            <p className="page-subtitle">Signed in as {user?.email}</p>
          </div>
        </header>

        <div className="admin-grid">
          <CreateTeacher onCreated={loadTeachers} />
          <section className="card">
            <div className="section-heading">
              <h2>All Teachers</h2>
              <span>{teachers.length} accounts</span>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            {loading ? (
              <Loader label="Loading teachers" />
            ) : (
              <TeacherList teachers={teachers} onDeactivate={deactivateTeacher} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
