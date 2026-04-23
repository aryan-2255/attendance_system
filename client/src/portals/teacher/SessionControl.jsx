import ScheduleSession from "./ScheduleSession";

const formatTime = (value) => {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const SessionControl = ({ activeSession, presentCount, studentCount, user, onStart, onEnd }) => {
  return (
    <section className="card session-card">
      <div className="section-heading">
        <h2>Session Control</h2>
        {activeSession ? (
          <span className="badge badge-success">Open</span>
        ) : (
          <span className="badge badge-warning">Closed</span>
        )}
      </div>

      {activeSession ? (
        <div className="active-session">
          <div>
            <span className="session-label">Current session</span>
            <h3>
              {activeSession.subject}, class {activeSession.class}
            </h3>
            <p>Started {formatTime(activeSession.started_at)}</p>
          </div>
          <div className="live-count">
            <span>{presentCount}</span>
            <p>marked live out of {studentCount}</p>
          </div>
          <button className="btn-danger" type="button" onClick={onEnd}>
            End Session
          </button>
        </div>
      ) : (
        <ScheduleSession disabled={false} onStart={onStart} user={user} />
      )}
    </section>
  );
};

export default SessionControl;
