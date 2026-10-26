import React, { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../api.js";
import { Stat, Tags, useToast } from "../components/ui.jsx";

export default function Admin() {
  const notify = useToast();
  const [stats, setStats] = useState({});
  const [matches, setMatches] = useState([]);
  const [min, setMin] = useState(50);
  const [error, setError] = useState("");
  const minInvalid = min === "" || Number(min) < 0 || Number(min) > 100;

  const load = () =>
    Promise.all([api("/dashboard/stats"), api("/matches")])
      .then(([s, m]) => {
        setStats(s);
        setMatches(m);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    if (minInvalid) return notify("Minimum score must be between 0 and 100", "error");
    try {
      const r = await api("/matches/generate", { method: "POST", body: JSON.stringify({ minimumScore: Number(min) }) });
      notify(r.message);
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const status = async (id, s) => {
    try {
      await api(`/matches/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: s }) });
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  return (
    <div className="wrap">
      <div className="welcome">
        <div>
          <span className="eyebrow">ADMIN CONTROL CENTER</span>
          <h1>Turn compatibility into opportunity.</h1>
          <p>Generate ranked recommendations, review the evidence, and publish final results.</p>
        </div>
        <div className="generate">
          <input type="number" value={min} min="0" max="100" aria-label="Minimum score" onChange={(e) => setMin(e.target.value)} />
          <button onClick={generate}>
            <RefreshCw /> Generate matches
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="grid stats five">
        <Stat n={stats.students || 0} t="Students" />
        <Stat n={stats.companies || 0} t="Companies" />
        <Stat n={stats.internships || 0} t="Active jobs" />
        <Stat n={stats.pending || 0} t="To review" />
        <Stat n={stats.approved || 0} t="Finalized" />
      </div>
      <h2>Match review queue</h2>
      <div className="table card">
        <div className="tr th">
          <span>Student</span>
          <span>Job</span>
          <span>Evidence</span>
          <span>Score</span>
          <span>Decision</span>
        </div>
        {matches.length === 0 && <div className="tr"><span>No matches yet. Generate matches to begin.</span></div>}
        {matches.map((m) => (
          <div className="tr" key={m._id}>
            <span>
              <b>{m.student?.user?.name}</b>
              <small>
                {m.student?.degree} · GPA {m.student?.gpa}
              </small>
            </span>
            <span>
              <b>{m.internship?.title}</b>
              <small>{m.internship?.company?.organization}</small>
            </span>
            <span>
              <Tags items={m.matchedSkills} />
              <small>{m.missingSkills.length ? `Missing: ${m.missingSkills.join(", ")}` : "All skills match"}</small>
            </span>
            <span>
              <b className="score">{m.score}%</b>
              <small>{m.status}</small>
            </span>
            <span className="actions">
              <button className="approve" onClick={() => status(m._id, "approved")} aria-label="Approve match">
                <CheckCircle2 />
              </button>
              <button className="reject" onClick={() => status(m._id, "rejected")} aria-label="Reject match">
                <XCircle />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
