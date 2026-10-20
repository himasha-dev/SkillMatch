import React, { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { api } from "../api.js";
import { Empty, Tags } from "../components/ui.jsx";

// Lists the company's job records
export default function JobBrowser({ reloadKey, onTotal }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/internships")
      .then((d) => {
        setItems(d.items);
        setError("");
        onTotal?.(d.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  return (
    <>
      {error && <div className="error">{error}</div>}
      <div className="cards">
        {!loading && !items.length && <Empty text="You have not posted any jobs yet." />}
        {items.map((j) => (
          <div className="job card" key={j._id}>
            <div className="jobtop">
              <div className="logo">
                <Briefcase />
              </div>
              <div>
                <h3>{j.title}</h3>
                <p>
                  {j.company?.organization || j.company?.name} · {j.location}
                </p>
              </div>
              <span className={`pill ${j.active ? "on" : "off"}`}>{j.active ? "Active" : "Closed"}</span>
            </div>
            <p className="clamp">{j.description}</p>
            <Tags items={j.requiredSkills} />
            <small>
              {j.openings} opening(s) · Min GPA {j.minimumGpa}
              {j.deadline && ` · Closes ${new Date(j.deadline).toLocaleDateString()}`}
            </small>
          </div>
        ))}
      </div>
    </>
  );
}
