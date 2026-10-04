import React from "react";
import { Link } from "react-router-dom";

const Success = () => (
  <section className="section">
    <div className="container narrow center">
      <svg className="check check--static" viewBox="0 0 52 52" aria-hidden="true"><circle className="check__circle" cx="26" cy="26" r="24" fill="none" /><path className="check__tick" fill="none" d="M14 27l8 8 16-17" /></svg>
      <h1 className="heading">All done</h1>
      <p>Your request was completed successfully.</p>
      <Link to="/" className="btn btn--primary">Back to home</Link>
    </div>
  </section>
);

export default Success;
