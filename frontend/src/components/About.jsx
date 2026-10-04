import React from "react";
import { Link } from "react-router-dom";
import { data } from "../restApi.json";
import { imgSrc } from "../utils";

const About = () => {
  const a = data[0].about;
  return (
    <section className="about section">
      <div className="container about__grid">
        <div className="about__text">
          <h2 className="heading">{a.title}</h2>
          <p className="about__tagline">{a.tagline}</p>
          <p>{a.description}</p>
          <Link to="/menu" className="btn btn--primary">{a.buttonText}</Link>
        </div>
        <div className="about__media">
          <div className="about__blob">
            <img src={imgSrc(a.image)} alt="Dal tadka served in a bowl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
