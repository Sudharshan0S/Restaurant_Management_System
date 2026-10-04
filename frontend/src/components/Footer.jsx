import React from "react";
import { Link } from "react-router-dom";
import { data } from "../restApi.json";
import { RESTAURANT } from "../config";

const Footer = () => (
  <footer className="footer">
    <div className="container footer__grid">
      <div>
        <p className="footer__brand">{RESTAURANT.name}</p>
        <p className="footer__muted">Authentic Indian dishes, online ordering and table reservations.</p>
      </div>
      <nav aria-label="Footer">
        <p className="footer__title">Explore</p>
        <ul>
          {data[0].navbarLinks.map((l) => (<li key={l.id}><Link to={l.to}>{l.title}</Link></li>))}
        </ul>
      </nav>
      <div>
        <p className="footer__title">Visit</p>
        <p className="footer__muted">{RESTAURANT.location}</p>
        <p className="footer__muted">Open daily, {RESTAURANT.hours}</p>
      </div>
    </div>
    <div className="footer__bar">© {new Date().getFullYear()} {RESTAURANT.name}. All rights reserved.</div>
  </footer>
);

export default Footer;
