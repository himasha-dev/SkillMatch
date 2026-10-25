import React, { useState } from "react";
import { api } from "../api.js";
import { DEGREES, Field, useToast } from "../components/ui.jsx";

function validate(f) {
  const e = {};
  if (f.field.trim().length < 2) e.field = "Field of study is required";
  if (f.gpa === "" || !(f.gpa >= 0 && f.gpa <= 4)) e.gpa = "GPA must be between 0 and 4";
  if (f.experienceMonths === "" || f.experienceMonths < 0) e.experienceMonths = "Experience cannot be negative";
  if (!f.skills.length) e.skills = "Add at least one skill";
  if ((f.bio || "").length > 500) e.bio = "Bio must be 500 characters or fewer";
  return e;
}

export default function Profile({ initial, done, cancel }) {
  const notify = useToast();
  const [f, setF] = useState(
    initial || { degree: "Bachelor", field: "", gpa: 3, skills: [], experienceMonths: 0, location: "Colombo", bio: "" },
  );
  const [skill, setSkill] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const addSkill = () => {
    const s = skill.trim();
    if (s && !f.skills.some((x) => x.toLowerCase() === s.toLowerCase())) setF({ ...f, skills: [...f.skills, s] });
    setSkill("");
  };

  const save = async (e) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await api("/students/profile", { method: "PUT", body: JSON.stringify(f) });
      notify("Profile saved");
      done();
    } catch (err) {
      setErrors(err.errors || {});
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap narrow">
      <span className="eyebrow">QUALIFICATION PROFILE</span>
      <h1>Tell us what you bring.</h1>
      <form className="card formgrid" onSubmit={save} noValidate>
        <Field label="Degree" error={errors.degree}>
          <select value={f.degree} onChange={(e) => setF({ ...f, degree: e.target.value })}>
            {DEGREES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Field of study" error={errors.field}>
          <input value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })} />
        </Field>
        <Field label="GPA (out of 4)" error={errors.gpa}>
          <input type="number" min="0" max="4" step="0.1" value={f.gpa} onChange={(e) => setF({ ...f, gpa: e.target.value === "" ? "" : +e.target.value })} />
        </Field>
        <Field label="Experience (months)" error={errors.experienceMonths}>
          <input type="number" min="0" value={f.experienceMonths} onChange={(e) => setF({ ...f, experienceMonths: e.target.value === "" ? "" : +e.target.value })} />
        </Field>
        <Field label="Location" className="wide" error={errors.location}>
          <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        </Field>
        <Field label="Skills" className="wide" error={errors.skills}>
          <div className="skillinput">
            <input
              value={skill}
              placeholder="Type a skill and press Enter"
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <button type="button" onClick={addSkill}>
              Add
            </button>
          </div>
          <div className="tags removable">
            {f.skills.map((s) => (
              <span key={s}>
                {s}
                <button type="button" aria-label={`Remove ${s}`} onClick={() => setF({ ...f, skills: f.skills.filter((x) => x !== s) })}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </Field>
        <Field label="Short bio" className="wide" error={errors.bio}>
          <textarea value={f.bio || ""} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={500} />
        </Field>
        <div className="wide row end">
          {initial && (
            <button type="button" className="secondary" onClick={cancel}>
              Cancel
            </button>
          )}
          <button disabled={busy}>{busy ? "Saving..." : "Save qualifications"}</button>
        </div>
      </form>
    </div>
  );
}
