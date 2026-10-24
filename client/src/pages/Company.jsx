import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Stat } from "../components/ui.jsx";
import JobBrowser from "./JobBrowser.jsx";
import JobForm from "./JobForm.jsx";

export default function Company() {
  const [form, setForm] = useState(null); // null | "new" | job
  const [reloadKey, setReloadKey] = useState(0);
  const [total, setTotal] = useState(0);

  return (
    <div className="wrap">
      <div className="welcome">
        <div>
          <span className="eyebrow">COMPANY DASHBOARD</span>
          <h1>Find your next standout hire.</h1>
          <p>Create clear requirements and let SkillMatch surface the fit.</p>
        </div>
        <button onClick={() => setForm("new")}>
          <Plus /> New job
        </button>
      </div>
      <div className="grid stats">
        <Stat n={total} t="Job listings" />
      </div>

      <h2>Your job listings</h2>
      <JobBrowser
        reloadKey={reloadKey}
        onTotal={setTotal}
        onEdit={(j) => setForm(j)}
      />

      {form && (
        <JobForm
          job={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
