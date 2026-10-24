import React, { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { Confirm, Stat, useToast } from "../components/ui.jsx";
import JobBrowser from "./JobBrowser.jsx";
import JobForm from "./JobForm.jsx";

export default function Company() {
  const notify = useToast();
  const [form, setForm] = useState(null); // null | "new" | job
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [total, setTotal] = useState(0);

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/internships/${toDelete._id}`, { method: "DELETE" });
      notify("Listing deleted");
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

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
        onDelete={(j) => setToDelete(j)}
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
      {toDelete && (
        <Confirm
          title="Delete job listing?"
          text={`"${toDelete.title}" will be permanently removed. This cannot be undone.`}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
