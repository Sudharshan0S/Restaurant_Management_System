import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { errorMessage } from "../../api";
import { isEmail, normalizePhone } from "../../utils";
import { Field } from "./AuthForm";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || "/";
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Enter your name.";
    if (!isEmail(form.email)) errs.email = "Enter a valid email address.";
    if (!normalizePhone(form.phone)) errs.phone = "Enter a valid 10-digit mobile number.";
    if (!(form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password))) errs.password = "Use at least 8 characters with a letter and a number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await register(form); toast.success("Account created. Welcome!"); navigate(from, { replace: true }); }
    catch (err) { setErrors({ form: errorMessage(err) }); }
    finally { setBusy(false); }
  };

  return (
    <section className="section">
      <div className="container authcard">
        <h1 className="heading">Create an account</h1>
        <form onSubmit={submit} noValidate>
          {errors.form && <p className="notice notice--warn" role="alert">{errors.form}</p>}
          <Field id="name" label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
          <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
          <Field id="phone" label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone} hint="10-digit Indian mobile number" />
          <Field id="password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="At least 8 characters, with a letter and a number" />
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? "Creating account…" : "Register"}</button>
        </form>
        <p className="muted">Already registered? <Link to="/login" state={{ from }}>Log in</Link></p>
      </div>
    </section>
  );
};

export default Register;
