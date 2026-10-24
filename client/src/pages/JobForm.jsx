import React, { useState } from "react";
import { api } from "../api.js";
import { DEGREES, Modal } from "../components/ui.jsx";

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function JobForm({ job, onClose, onSaved }) {
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = {
        ...f,
        minimumGpa: Number(f.minimumGpa),
        openings: Number(f.openings),
        requiredSkills: f.requiredSkills.split(",").map((x) => x.trim()).filter(Boolean),
        deadline: f.deadline || null,
      };
      await api(job ? `/internships/${job._id}` : "/internships", { method: job ? "PUT" : "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={job ? "Edit job listing" : "New job listing"} onClose={onClose}>
      {error && <div className="error">{error}</div>}
      <form className="formgrid" onSubmit={save}>
        <label>
          Job title
          <input value={f.title} onChange={set("title")} maxLength={100} required />
        </label>
        <label>
          Preferred field
          <input value={f.preferredField} onChange={set("preferredField")} placeholder="Any" />
        </label>
        <label className="wide">
          Description
          <textarea value={f.description} onChange={set("description")} maxLength={2000} required />
        </label>
        <label className="wide">
          Required skills (comma separated)
          <input value={f.requiredSkills} onChange={set("requiredSkills")} placeholder="React, Node.js, SQL" required />
        </label>
        <label>
          Minimum degree
          <select value={f.minimumDegree} onChange={set("minimumDegree")}>
            {DEGREES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Minimum GPA (0-4)
          <input type="number" step="0.1" min="0" max="4" value={f.minimumGpa} onChange={set("minimumGpa")} />
        </label>
        <label>
          Location
          <input value={f.location} onChange={set("location")} />
        </label>
        <label>
          Openings
          <input type="number" min="1" value={f.openings} onChange={set("openings")} />
        </label>
        <label>
          Application deadline
          <input type="date" value={f.deadline} onChange={set("deadline")} />
        </label>
        {job && (
          <label>
            Status
            <select value={f.active ? "active" : "closed"} onChange={(e) => setF({ ...f, active: e.target.value === "active" })}>
              <option value="active">Active (visible to candidates)</option>
              <option value="closed">Closed</option>
            </select>
          </label>
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
