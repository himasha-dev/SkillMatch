import React, { useState } from "react";
import { api } from "../api.js";
import { DEGREES, Field, Modal, useToast } from "../components/ui.jsx";

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function validate(f) {
  const e = {};
  if (f.title.trim().length < 3) e.title = "Title must be at least 3 characters";
  if (f.description.trim().length < 10) e.description = "Description must be at least 10 characters";
  if (!f.requiredSkills.split(",").some((s) => s.trim())) e.requiredSkills = "Add at least one skill";
  if (!(f.minimumGpa >= 0 && f.minimumGpa <= 4) || f.minimumGpa === "") e.minimumGpa = "GPA must be between 0 and 4";
  if (!Number.isInteger(+f.openings) || +f.openings < 1) e.openings = "Openings must be a whole number, 1 or more";
  if (f.deadline && new Date(f.deadline) < new Date(new Date().toDateString()))
    e.deadline = "Deadline cannot be in the past";
  return e;
}

// Used for both CREATE (job = null) and UPDATE (job = existing record)
export default function JobForm({ job, onClose, onSaved }) {
  const notify = useToast();
  const [f, setF] = useState(
    job
      ? {
          title: job.title,
          description: job.description,
          requiredSkills: job.requiredSkills.join(", "),
          minimumDegree: job.minimumDegree,
          preferredField: job.preferredField,
          minimumGpa: job.minimumGpa,
          location: job.location,
          openings: job.openings,
          deadline: toDateInput(job.deadline),
          active: job.active,
        }
      : {
          title: "",
          description: "",
          requiredSkills: "",
          minimumDegree: "Bachelor",
          preferredField: "Any",
          minimumGpa: 2.5,
          location: "Colombo",
          openings: 1,
          deadline: "",
          active: true,
        },
  );
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const body = {
        ...f,
        minimumGpa: Number(f.minimumGpa),
        openings: Number(f.openings),
        requiredSkills: f.requiredSkills.split(",").map((x) => x.trim()).filter(Boolean),
        deadline: f.deadline || null,
      };
      await api(job ? `/internships/${job._id}` : "/internships", {
        method: job ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      notify(job ? "Listing updated" : "Listing published");
      onSaved();
    } catch (err) {
      setErrors(err.errors || {});
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={job ? "Edit job listing" : "New job listing"} onClose={onClose}>
      <form className="formgrid" onSubmit={save} noValidate>
        <Field label="Job title" error={errors.title}>
          <input value={f.title} onChange={set("title")} maxLength={100} />
        </Field>
        <Field label="Preferred field" error={errors.preferredField}>
          <input value={f.preferredField} onChange={set("preferredField")} placeholder="Any" />
        </Field>
        <Field label="Description" error={errors.description} className="wide">
          <textarea value={f.description} onChange={set("description")} maxLength={2000} />
        </Field>
        <Field label="Required skills (comma separated)" error={errors.requiredSkills} className="wide">
          <input value={f.requiredSkills} onChange={set("requiredSkills")} placeholder="React, Node.js, SQL" />
        </Field>
        <Field label="Minimum degree" error={errors.minimumDegree}>
          <select value={f.minimumDegree} onChange={set("minimumDegree")}>
            {DEGREES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Minimum GPA (0-4)" error={errors.minimumGpa}>
          <input type="number" step="0.1" min="0" max="4" value={f.minimumGpa} onChange={set("minimumGpa")} />
        </Field>
        <Field label="Location" error={errors.location}>
          <input value={f.location} onChange={set("location")} />
        </Field>
        <Field label="Openings" error={errors.openings}>
          <input type="number" min="1" value={f.openings} onChange={set("openings")} />
        </Field>
        <Field label="Application deadline" error={errors.deadline}>
          <input type="date" value={f.deadline} onChange={set("deadline")} />
        </Field>
        {job && (
          <Field label="Status">
            <select value={f.active ? "active" : "closed"} onChange={(e) => setF({ ...f, active: e.target.value === "active" })}>
              <option value="active">Active (visible to candidates)</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        )}
        <div className="wide row end">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy}>{busy ? "Saving..." : job ? "Save changes" : "Publish listing"}</button>
        </div>
      </form>
    </Modal>
  );
}
