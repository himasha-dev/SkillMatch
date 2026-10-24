import React, { useState } from "react";
import { Target } from "lucide-react";
import { api } from "../api.js";
import { Field } from "../components/ui.jsx";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f, login) {
  const e = {};
  if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email address";
  if (login) {
    if (!f.password) e.password = "Password is required";
    return e;
  }
  if (f.name.trim().length < 2) e.name = "Name must be at least 2 characters";
  if (f.password.length < 8) e.password = "Password must be at least 8 characters";
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))
    e.password = "Use both letters and numbers";
  if (f.role === "company" && !f.organization.trim()) e.organization = "Organization is required";
  return e;
}

export default function Auth({ onLogin }) {
  const [login, setLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", organization: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate(form, login);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const data = await api(`/auth/${login ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setBusy(false);
    }
  };


  return (
    <main className="auth">
      <section className="hero">
        <div className="brand">
          <span>
            <Target />
          </span>{" "}
          SkillMatch
        </div>
        <h1>
          Skills aligned.
          <br />
          <em>Careers accelerated.</em>
        </h1>
        <p>
          A smart job matching and application tracking system connecting qualified candidates with the right companies.
        </p>
        <div className="steps">
          <span>01 Build your profile</span>
          <span>02 Match & apply</span>
          <span>03 Track progress</span>
        </div>
      </section>
      <section className="authbox">
        <div className="card">
          <h2>{login ? "Welcome back" : "Create an account"}</h2>
          <p>{login ? "Sign in to continue to your dashboard." : "Join as a candidate or company."}</p>
          {error && <div className="error" role="alert">{error}</div>}
          <form onSubmit={submit} noValidate>
            {!login && (
              <>
                <Field label="Full name" error={errors.name}>
                  <input value={form.name} onChange={set("name")} />
                </Field>
                <Field label="Account type" error={errors.role}>
                  <select value={form.role} onChange={set("role")}>
                    <option value="student">Candidate</option>
                    <option value="company">Company</option>
                  </select>
                </Field>
                {form.role === "company" && (
                  <Field label="Organization" error={errors.organization}>
                    <input value={form.organization} onChange={set("organization")} />
                  </Field>
                )}
              </>
            )}
            <Field label="Email" error={errors.email}>
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            </Field>
            <Field label="Password" error={errors.password}>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete={login ? "current-password" : "new-password"}
              />
            </Field>
            <button disabled={busy}>{busy ? "Please wait..." : "Continue"} <span>→</span></button>
          </form>
          <p className="switch">
            {login ? "New to SkillMatch?" : "Already registered?"}{" "}
            <a
              onClick={() => {
                setLogin(!login);
                setErrors({});
                setError("");
              }}
            >
              {login ? "Create account" : "Sign in"}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
