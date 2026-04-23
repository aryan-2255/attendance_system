const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const TeacherList = ({ teachers, onDeactivate }) => {
  if (!teachers.length) {
    return <div className="empty-state">No teachers created yet.</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Subject</th>
          <th>Class</th>
          <th>Status</th>
          <th>Created</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {teachers.map((teacher) => (
          <tr key={teacher._id}>
            <td>{teacher.name}</td>
            <td>{teacher.email}</td>
            <td>{teacher.subject}</td>
            <td>{teacher.class}</td>
            <td>
              <span className={`badge ${teacher.active ? "badge-success" : "badge-danger"}`}>
                {teacher.active ? "Active" : "Inactive"}
              </span>
            </td>
            <td>{formatDate(teacher.created_at)}</td>
            <td>
              <button
                className="btn-outline table-action"
                type="button"
                disabled={!teacher.active}
                onClick={() => onDeactivate(teacher._id)}
              >
                Deactivate
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TeacherList;
