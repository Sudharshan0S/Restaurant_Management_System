import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { errorMessage } from "../../api";
import { isEmail } from "../../utils";
import { Field } from "./AuthForm";

const AdminLogin = () => {
  const { adminLogin, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { if (isAdmin) navigate("/admin", { replace: true }); }, [isAdmin, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (!isEmail(form.email)) errs.email = "Enter a valid email address.";
    if (!form.password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await adminLogin(form); toast.success("Welcome, admin."); navigate("/admin", { replace: true }); }
    catch (err) { setErrors({ form: errorMessage(err) }); }
    finally { setBusy(false); }
  };

  return (
    <section className="section">
      <div className="container authcard">
        <h1 className="heading">Admin login</h1>
        <p className="muted center">For restaurant staff only.</p>
        <form onSubmit={submit} noValidate>
          {errors.form && <p className="notice notice--warn" role="alert">{errors.form}</p>}
          <Field id="email" label="Admin email" type="email" autoComplete="username" value={form.email} onChange={set("email")} error={errors.email} />
          <Field id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set("password")} error={errors.password} />
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? "Logging in…" : "Log in as admin"}</button>
        </form>
        <p className="muted">Not staff? <Link to="/login">Customer login</Link></p>
      </div>
    </section>
  );
};

export default AdminLogin;
