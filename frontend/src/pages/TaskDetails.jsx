import React from "react";
import { useParams, Link } from "react-router-dom";

function TaskDetails() {
  const { id } = useParams();

  return (
    <div>
      <h2>Task Details</h2>
      <p>Task ID: {id}</p>

      {/* Navigation back */}
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default TaskDetails;