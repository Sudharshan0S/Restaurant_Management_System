import React from "react";
import { useMenu } from "../contexts/MenuContext";
import { RESTAURANT } from "../config";

// Numbers are derived from the live menu data, not hardcoded.
const WhoAreWe = () => {
  const { menu, loading, error } = useMenu();
  const stats = menu
    ? [
        { n: menu.dishes.length, label: "Indian dishes" },
        { n: menu.categories.length, label: "Food categories" },
        { n: menu.combos.length, label: "Special combos" },
        { n: RESTAURANT.hours, label: "Open daily" },
      ]
    : [];
  return (
    <section className="who section">
      <div className="container">
        <h2 className="heading">Who are we</h2>
        {loading && <p className="muted" role="status">Loading…</p>}
        {error && <p className="notice notice--warn" role="alert">{error}</p>}
        <dl className="who__grid">
          {stats.map((s) => (
            <div className="who__stat" key={s.label}><dt>{s.label}</dt><dd>{s.n}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default WhoAreWe;
