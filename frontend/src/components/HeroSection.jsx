import React from "react";
import { Link } from "react-router-dom";
import { data } from "../restApi.json";
import { imgSrc } from "../utils";

const ALTS = ["Hyderabadi biryani", "Paneer tikka", "Masala dosa"];

const HeroSection = () => {
  const h = data[0].heroSection;
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__text">
          <h1>{h.title}</h1>
          <p>{h.subtitle}</p>
          <div className="hero__cta">
            <Link to="/menu" className="btn btn--primary">View the menu</Link>
            <Link to="/reservation" className="btn btn--outline">Reserve a table</Link>
          </div>
        </div>
        <div className="hero__images" aria-label="Featured dishes">
          {h.images.slice(0, 3).map((src, i) => (
            <img key={src} src={imgSrc(src)} alt={ALTS[i] || "Indian dish"} className={`hero__img hero__img--${i + 1}`} fetchPriority={i === 0 ? "high" : "auto"} decoding="async" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
