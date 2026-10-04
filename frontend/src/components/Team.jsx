import React from "react";
import { HiOutlineUserCircle } from "react-icons/hi";
import { data } from "../restApi.json";

// Edit src/restApi.json -> team.members to add real names. Blank names are simply not shown.
const Team = () => {
  const t = data[0].team;
  return (
    <section className="team section">
      <div className="container">
        <h2 className="heading">Our team</h2>
        <p className="lead">{t.intro}</p>
        <ul className="team__grid">
          {t.members.map((m) => (
            <li className="team__card" key={m.id}>
              <HiOutlineUserCircle className="team__avatar" aria-hidden="true" />
              {m.name && <h3>{m.name}</h3>}
              <p className="team__role">{m.designation}</p>
              <p className="muted">{m.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Team;
