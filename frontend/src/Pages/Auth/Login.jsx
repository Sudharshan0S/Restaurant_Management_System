import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { errorMessage } from "../../api";
import { isEmail } from "../../utils";
import { Field } from "./AuthForm";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (!isEmail(form.email)) errs.email = "Enter a valid email address.";
    if (!form.password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await login(form); toast.success("Welcome back!"); navigate(from, { replace: true }); }
    catch (err) { setErrors({ form: errorMessage(err) }); }
    finally { setBusy(false); }
  };

  return (
    <section className="section">
      <div className="container authcard">
        <h1 className="heading">Customer login</h1>
        <form onSubmit={submit} noValidate>
          {errors.form && <p className="notice notice--warn" role="alert">{errors.form}</p>}
          <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
          <Field id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set("password")} error={errors.password} />
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        </form>
        <p className="muted">New here? <Link to="/register" state={{ from }}>Create an account</Link></p>
        <p className="muted">Restaurant staff? <Link to="/admin/login">Admin login</Link></p>
      </div>
    </section>
  );
};

export default Login;
