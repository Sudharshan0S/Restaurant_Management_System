import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="notFound section">
    <div className="container narrow center">
      <img src="/notFound.svg" alt="" aria-hidden="true" />
      <h1 className="heading">Looks like you're lost</h1>
      <p>We can't find the page you're looking for.</p>
      <Link to="/" className="btn btn--primary">Back to home</Link>
    </div>
  </section>
);

export default NotFound;
