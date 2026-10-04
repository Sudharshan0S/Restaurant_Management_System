import React from "react";
import { data } from "../restApi.json";
import { imgSrc } from "../utils";

const Qualities = () => (
  <section className="qualities section" id="qualities">
    <div className="container">
      <h2 className="heading">What we stand for</h2>
      <ul className="qualities__grid">
        {data[0].ourQualities.map((q) => (
          <li className="quality" key={q.id}>
            <img src={imgSrc(q.image)} alt="" aria-hidden="true" />
            <h3>{q.title}</h3>
            <p>{q.description}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default Qualities;
