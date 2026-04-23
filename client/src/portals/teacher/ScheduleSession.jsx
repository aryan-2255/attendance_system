const ScheduleSession = ({ disabled, onStart, user }) => {
  return (
    <div className="schedule-session">
      <div>
        <span className="session-label">Ready session</span>
        <strong>
          {user.subject}, class {user.class}
        </strong>
      </div>
      <button className="btn-primary" type="button" disabled={disabled} onClick={onStart}>
        Start Session
      </button>
    </div>
  );
};

export default ScheduleSession;
