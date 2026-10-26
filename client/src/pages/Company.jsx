import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { Confirm, Empty, Stat, Tags, useToast } from "../components/ui.jsx";
import JobBrowser from "./JobBrowser.jsx";
import JobDetail from "./JobDetail.jsx";
import JobForm from "./JobForm.jsx";

const STATUSES = ["submitted", "reviewing", "shortlisted", "interview", "offered", "rejected"];

export default function Company() {
  const notify = useToast();
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null | "new" | job
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [total, setTotal] = useState(0);

  const load = () =>
    Promise.all([api("/matches"), api("/applications")])
      .then(([m, a]) => {
        setMatches(m);
        setApplications(a);
        setReloadKey((k) => k + 1);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const update = async (id, status) => {
    try {
      await api(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      notify("Stage updated");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/internships/${toDelete._id}`, { method: "DELETE" });
      notify("Listing deleted");
      setToDelete(null);
      load();
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
      {error && <div className="error">{error}</div>}
      <div className="grid stats">
        <Stat n={total} t="Job listings" />
        <Stat n={applications.length} t="Applications" />
        <Stat n={applications.filter((a) => ["shortlisted", "interview", "offered"].includes(a.status)).length} t="In late stages" />
      </div>

      <h2>Your job listings</h2>
      <JobBrowser
        mode="company"
        reloadKey={reloadKey}
        onTotal={setTotal}
        onView={(j) => setViewId(j._id)}
        onEdit={(j) => setForm(j)}
        onDelete={(j) => setToDelete(j)}
      />

      <h2>Application pipeline</h2>
      <div className="table card">
        <div className="tr apptr th">
          <span>Candidate</span>
          <span>Job</span>
          <span>Current stage</span>
          <span>Update stage</span>
        </div>
        {applications.length === 0 && <div className="tr"><span>No applications yet.</span></div>}
        {applications.map((a) => (
          <div className="tr apptr" key={a._id}>
            <span>
              <b>{a.student?.user?.name}</b>
              <small>
                {a.student?.field} · GPA {a.student?.gpa}
              </small>
            </span>
            <span>
              <b>{a.internship?.title}</b>
            </span>
            <span className={`status status-${a.status}`}>{a.status}</span>
            <span>
              {a.status === "withdrawn" ? (
                <small>Withdrawn by candidate</small>
              ) : (
                <select value={a.status} onChange={(e) => update(a._id, e.target.value)} aria-label="Update stage">
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
            </span>
          </div>
        ))}
      </div>

      <h2>Admin-approved candidates</h2>
      <div className="cards">
        {matches.length ? (
          matches.map((m) => (
            <div className="card match" key={m._id}>
              <div className="ring" style={{ "--p": `${m.score * 3.6}deg` }}>
                <b>{m.score}%</b>
              </div>
              <div>
                <span className="status">APPROVED MATCH</span>
                <h3>{m.student?.user?.name}</h3>
                <p>
                  {m.student?.degree} in {m.student?.field} · for {m.internship?.title}
                </p>
                <Tags items={m.matchedSkills} />
                {m.missingSkills.length > 0 && <small>Missing: {m.missingSkills.join(", ")}</small>}
              </div>
            </div>
          ))
        ) : (
          <Empty text="Admin-approved candidates will appear here." />
        )}
      </div>

      {form && (
        <JobForm
          job={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
      {viewId && (
        <JobDetail
          id={viewId}
          onClose={() => setViewId(null)}
          actions={(job) => (
            <div className="row end">
              <button
                className="secondary"
                onClick={() => {
                  setViewId(null);
                  setForm(job);
                }}
              >
                Edit
              </button>
              <button
                className="danger"
                onClick={() => {
                  setViewId(null);
                  setToDelete(job);
                }}
              >
                Delete
              </button>
            </div>
          )}
        />
      )}
      {toDelete && (
        <Confirm
          title="Delete job listing?"
          text={`"${toDelete.title}" and all matches and applications linked to it will be permanently removed. This cannot be undone.`}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
