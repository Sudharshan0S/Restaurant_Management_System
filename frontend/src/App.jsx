import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./Pages/Home/Home";
import "./assets/css/styles.css";

// Only the home page is in the first download; everything else loads when it is opened.
const About = lazy(() => import("./components/About"));
const Qualities = lazy(() => import("./components/Qualities"));
const Menu = lazy(() => import("./components/Menu"));
const WhoAreWe = lazy(() => import("./components/WhoAreWe"));
const Team = lazy(() => import("./components/Team"));
const Reservation = lazy(() => import("./components/Reservation"));
const OrderCart = lazy(() => import("./components/OrderCart"));
const Success = lazy(() => import("./Pages/Success/Success"));
const NotFound = lazy(() => import("./Pages/NotFound/NotFound"));
const Login = lazy(() => import("./Pages/Auth/Login"));
const Register = lazy(() => import("./Pages/Auth/Register"));
const AdminLogin = lazy(() => import("./Pages/Auth/AdminLogin"));
const Admin = lazy(() => import("./components/admin/Admin"));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App = () => (
  <Router>
    <a className="skip-link" href="#main">Skip to content</a>
    <Navbar />
    <ScrollToTop />
    <main id="main">
      <Suspense fallback={<p className="muted center section" role="status">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/success" element={<Success />} />
          <Route path="/about" element={<About />} />
          <Route path="/qualities" element={<Qualities />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/order" element={<OrderCart />} />
          <Route path="/whoarewe" element={<WhoAreWe />} />
          <Route path="/team" element={<Team />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </main>
    <Footer />
    <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
  </Router>
);

export default App;
