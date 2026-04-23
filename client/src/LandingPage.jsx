import { useNavigate } from "react-router-dom";

const portals = [
  {
    role: "Admin",
    path: "/admin/login",
    description: "Manage teachers, view all classes and sessions",
    icon: "A",
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
  },
  {
    role: "Teacher",
    path: "/teacher/login",
    description: "Start sessions and track student attendance in real time",
    icon: "T",
    color: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)",
  },
  {
    role: "Student",
    path: "/student/login",
    description: "Mark attendance with face scan during an open session",
    icon: "S",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.bg} aria-hidden="true" />

      <header style={styles.header}>
        <div style={styles.badge}>Face Recognition</div>
        <h1 style={styles.title}>Attendance System</h1>
        <p style={styles.subtitle}>
          AI-powered attendance — no roll calls, no proxy.
          <br />
          Select your portal to get started.
        </p>
      </header>

      <main style={styles.grid}>
        {portals.map((portal) => (
          <button
            key={portal.role}
            style={styles.card}
            onClick={() => navigate(portal.path)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-6px)";
              e.currentTarget.style.boxShadow = `0 20px 40px ${portal.color}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)";
            }}
            id={`portal-${portal.role.toLowerCase()}`}
            type="button"
          >
            <div style={{ ...styles.icon, background: portal.gradient }}>
              {portal.icon}
            </div>
            <h2 style={styles.cardTitle}>{portal.role} Portal</h2>
            <p style={styles.cardDesc}>{portal.description}</p>
            <span style={{ ...styles.cta, color: portal.color }}>
              Sign in &rarr;
            </span>
          </button>
        ))}
      </main>

      <footer style={styles.footer}>
        Attendance System - All portals on one page
      </footer>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0f13",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse 80% 60% at 50% -10%, #6366f122 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, #0ea5e911 0%, transparent 60%)",
    pointerEvents: "none",
  },
  header: {
    textAlign: "center",
    marginBottom: "3rem",
    position: "relative",
    zIndex: 1,
  },
  badge: {
    display: "inline-block",
    padding: "0.3rem 1rem",
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "999px",
    color: "#a5b4fc",
    fontSize: "0.78rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "clamp(2rem, 5vw, 3.2rem)",
    fontWeight: 800,
    color: "#f8fafc",
    margin: "0 0 1rem",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    maxWidth: "480px",
    margin: "0 auto",
  },
  grid: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "2rem 1.8rem",
    width: "260px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.75rem",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    textAlign: "left",
  },
  icon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#fff",
    flexShrink: 0,
  },
  cardTitle: {
    color: "#f1f5f9",
    fontSize: "1.15rem",
    fontWeight: 700,
    margin: 0,
  },
  cardDesc: {
    color: "#94a3b8",
    fontSize: "0.88rem",
    lineHeight: 1.6,
    margin: 0,
    flexGrow: 1,
  },
  cta: {
    fontSize: "0.9rem",
    fontWeight: 600,
    marginTop: "0.25rem",
  },
  footer: {
    marginTop: "3rem",
    color: "#475569",
    fontSize: "0.8rem",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
};

export default LandingPage;
