import React, { useState } from "react";
import { api } from "../api.js";
import { DEGREES, Modal } from "../components/ui.jsx";

export default function JobForm({ onClose, onSaved }) {
  const [f, setF] = useState(
    {
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
      await api("/internships", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={"New job listing"} onClose={onClose}>
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
        <div className="wide row end">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy}>{busy ? "Saving..." : "Publish listing"}</button>
        </div>
      </form>
    </Modal>
  );
}
