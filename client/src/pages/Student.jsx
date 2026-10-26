import React, { useEffect, useState } from "react";
import { Trash2, Undo2 } from "lucide-react";
import { api } from "../api.js";
import { Confirm, Empty, Field, Modal, Stat, useToast } from "../components/ui.jsx";
import Profile from "./Profile.jsx";
import JobBrowser from "./JobBrowser.jsx";
import JobDetail from "./JobDetail.jsx";

const STAGES = ["reviewing", "shortlisted", "interview", "offered"];
const reached = (status, i) => STAGES.indexOf(status) >= i;

function ApplyModal({ job, onClose, onDone }) {
  const notify = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const tooLong = note.length > 1000;
  const submit = async (e) => {
    e.preventDefault();
    if (tooLong) return;
    setBusy(true);
    try {
      await api("/applications", { method: "POST", body: JSON.stringify({ internship: job._id, coverNote: note }) });
      notify("Application submitted");
      onDone();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Apply: ${job.title}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Field label={`Cover note (optional, ${note.length}/1000)`} error={tooLong && "Cover note must be 1000 characters or fewer"}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you a good fit?" />
        </Field>
        <div className="row end">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy || tooLong}>{busy ? "Sending..." : "Submit application"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Student() {
  const notify = useToast();
  const [profile, setProfile] = useState(undefined);
  const [applications, setApplications] = useState([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [viewId, setViewId] = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [total, setTotal] = useState(0);

  const load = () =>
    Promise.all([api("/students/profile"), api("/applications")])
      .then(([p, a]) => {
        setProfile(p);
        setApplications(a);
        setEditing(!p);
        setReloadKey((k) => k + 1);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const withdraw = async (a) => {
    try {
      await api(`/applications/${a._id}/withdraw`, { method: "PATCH" });
      notify("Application withdrawn");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/applications/${toDelete._id}`, { method: "DELETE" });
      notify("Application deleted");
      setToDelete(null);
      load();
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="wrap"><div className="error">{error}</div></div>;
  if (profile === undefined) return <div className="wrap"><p>Loading...</p></div>;
  if (editing) return <Profile initial={profile} done={load} cancel={() => setEditing(false)} />;

  const appliedIds = applications.filter((a) => a.status !== "withdrawn").map((a) => a.internship?._id);
  const startApply = (j) => {
    setViewId(null);
    setApplyJob(j);
  };

  return (
    <div className="wrap">
      <div className="welcome">
        <div>
          <span className="eyebrow">CANDIDATE DASHBOARD</span>
          <h1>Ready for your next step?</h1>
          <p>Your profile is matched against {total} active opportunities.</p>
        </div>
        <button className="secondary" onClick={() => setEditing(true)}>
          Edit profile
        </button>
      </div>
      <div className="grid stats">
        <Stat n={`${profile?.gpa ?? 0}/4`} t="Current GPA" />
        <Stat n={profile?.skills?.length || 0} t="Skills listed" />
        <Stat n={applications.length} t="Applications" />
      </div>

      <h2>Application tracker</h2>
      <div className="tracker">
        {applications.length ? (
          applications.map((a) => (
            <div className="card application" key={a._id}>
              <div>
                <span className={`status status-${a.status}`}>{a.status}</span>
                <h3>{a.internship?.title}</h3>
                <p>
                  {a.internship?.company?.organization} · Updated {new Date(a.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <div className="stagebar">
                  <i className="done"></i>
                  {STAGES.map((s, i) => (
                    <i key={s} className={reached(a.status, i) ? "done" : ""}></i>
                  ))}
                </div>
                <div className="row end appactions">
                  {!["withdrawn", "rejected", "offered"].includes(a.status) && (
                    <button className="secondary" onClick={() => withdraw(a)}>
                      <Undo2 /> Withdraw
                    </button>
                  )}
                  <button className="danger" onClick={() => setToDelete(a)} aria-label="Delete application">
                    <Trash2 /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <Empty text="Apply to a job to start tracking your progress." />
        )}
      </div>

      <h2>Open jobs</h2>
      <JobBrowser
        mode="student"
        reloadKey={reloadKey}
        appliedIds={appliedIds}
        onTotal={setTotal}
        onView={(j) => setViewId(j._id)}
        onApply={startApply}
      />

      {viewId && (
        <JobDetail
          id={viewId}
          onClose={() => setViewId(null)}
          actions={(job) => (
            <div className="row end">
              <button disabled={appliedIds.includes(job._id)} onClick={() => startApply(job)}>
                {appliedIds.includes(job._id) ? "Applied" : "Apply now"}
              </button>
            </div>
          )}
        />
      )}
      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onDone={() => {
            setApplyJob(null);
            load();
          }}
        />
      )}
      {toDelete && (
        <Confirm
          title="Delete application?"
          text={`This permanently removes your application for "${toDelete.internship?.title}" and its history.`}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
