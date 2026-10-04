import React, { useContext, useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { HiMenu, HiX, HiOutlineShoppingCart } from "react-icons/hi";
import toast from "react-hot-toast";
import { data } from "../restApi.json";
import { RESTAURANT } from "../config";
import { CartContext } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { count } = useContext(CartContext);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = async () => {
    try { await logout(); toast.success("You have been logged out."); navigate(isAdmin ? "/admin/login" : "/"); }
    catch { toast.error("Unable to log out. Please try again."); }
  };

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="nav__brand">{RESTAURANT.name}</Link>

        <button className="nav__toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="nav-panel" onClick={() => setOpen((o) => !o)}>
          {open ? <HiX /> : <HiMenu />}
        </button>

        <nav id="nav-panel" className={`nav__panel ${open ? "is-open" : ""}`} aria-label="Main" onClick={(e) => { if (e.target.closest("a, button")) setOpen(false); }}>
          <ul className="nav__links">
            {data[0].navbarLinks.map((l) => (
              <li key={l.id}><NavLink to={l.to} end={l.to === "/"} className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}>{l.title}</NavLink></li>
            ))}
          </ul>
          <div className="nav__actions">
            {!isAdmin && (
              <Link to="/order" className="nav__cart" aria-label={`Cart, ${count} items`}>
                <HiOutlineShoppingCart aria-hidden="true" />
                {count > 0 && <span className="nav__badge">{count}</span>}
              </Link>
            )}
            {isAdmin && <Link to="/admin" className="btn btn--gold btn--sm">Dashboard</Link>}
            {user ? (
              <>
                <span className="nav__user">{isAdmin ? "Admin" : `Hi, ${user.name.split(" ")[0]}`}</span>
                <button className="btn btn--ghost-light btn--sm" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost-light btn--sm">Login</Link>
                <Link to="/register" className="btn btn--gold btn--sm">Register</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
