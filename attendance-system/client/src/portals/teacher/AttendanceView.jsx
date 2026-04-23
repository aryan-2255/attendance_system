const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const durationLabel = (session) => {
  if (session.status === "open") {
    return "In progress";
  }

  if (!session.duration_minutes) {
    return "Not available";
  }

  return `${session.duration_minutes} min`;
};

const AttendanceView = ({ sessions }) => {
  return (
    <section className="card session-history">
      <div className="section-heading">
        <h2>Session History</h2>
        <span>{sessions.length} sessions</span>
      </div>
      {sessions.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Class</th>
              <th>Total marked</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session._id}>
                <td>{formatDate(session.started_at)}</td>
                <td>{session.subject}</td>
                <td>{session.class}</td>
                <td>{session.total_marked || 0}</td>
                <td>{durationLabel(session)}</td>
                <td>
                  <span
                    className={`badge ${
                      session.status === "open" ? "badge-success" : "badge-warning"
                    }`}
                  >
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">No sessions have been taken yet.</div>
      )}
    </section>
  );
};

export default AttendanceView;
