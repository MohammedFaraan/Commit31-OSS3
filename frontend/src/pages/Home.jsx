import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div>
      <h2>Home Page</h2>
      <p>This is the board view.</p>

      {/* Example navigation link */}
      <Link to="/task/1">Go to Task 1</Link>
    </div>
  );
}

export default Home;