import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Stat } from "../components/ui.jsx";
import Profile from "./Profile.jsx";
import JobBrowser from "./JobBrowser.jsx";
import JobDetail from "./JobDetail.jsx";

export default function Student() {
  const [profile, setProfile] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [viewId, setViewId] = useState(null);
  const [total, setTotal] = useState(0);

  const load = () =>
    api("/students/profile")
      .then((p) => {
        setProfile(p);
        setEditing(!p);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="wrap"><div className="error">{error}</div></div>;
  if (profile === undefined) return <div className="wrap"><p>Loading...</p></div>;
  if (editing) return <Profile initial={profile} done={load} cancel={() => setEditing(false)} />;

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
      </div>

      <h2>Open jobs</h2>
      <JobBrowser mode="student" onTotal={setTotal} onView={(j) => setViewId(j._id)} />

      {viewId && <JobDetail id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}
