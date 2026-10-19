import React, { useState } from "react";
import { Target } from "lucide-react";
import { api } from "../api.js";

export default function Auth({ onLogin }) {
  const [login, setLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", organization: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
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
          <form onSubmit={submit}>
            {!login && (
              <>
                <label>Full name
                  <input value={form.name} onChange={set("name")} />
                </label>
                <label>Account type
                  <select value={form.role} onChange={set("role")}>
                    <option value="student">Candidate</option>
                    <option value="company">Company</option>
                  </select>
                </label>
                {form.role === "company" && (
                  <label>Organization
                    <input value={form.organization} onChange={set("organization")} />
                  </label>
                )}
              </>
            )}
            <label>Email
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" />
            </label>
            <label>Password
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete={login ? "current-password" : "new-password"}
              />
            </label>
            <button disabled={busy}>{busy ? "Please wait..." : "Continue"} <span>→</span></button>
          </form>
          <p className="switch">
            {login ? "New to SkillMatch?" : "Already registered?"}{" "}
            <a
              onClick={() => {
                setLogin(!login);
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
