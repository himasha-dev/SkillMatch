import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Modal, Tags } from "../components/ui.jsx";

// READ (single record) modal
export default function JobDetail({ id, onClose, actions }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/internships/${id}`).then(setJob).catch((e) => setError(e.message));
  }, [id]);
  return (
    <Modal title={job?.title || "Job details"} onClose={onClose}>
      {error && <div className="error">{error}</div>}
      {!job && !error && <p>Loading...</p>}
      {job && (
        <>
          <p className="muted">
            {job.company?.organization || job.company?.name} · {job.location} · {job.active ? "Active" : "Closed"}
          </p>
          <p className="prewrap">{job.description}</p>
          <h3>Required skills</h3>
          <Tags items={job.requiredSkills} />
          <dl className="facts">
            <div><dt>Minimum degree</dt><dd>{job.minimumDegree}</dd></div>
            <div><dt>Preferred field</dt><dd>{job.preferredField}</dd></div>
            <div><dt>Minimum GPA</dt><dd>{job.minimumGpa}</dd></div>
            <div><dt>Openings</dt><dd>{job.openings}</dd></div>
            <div><dt>Deadline</dt><dd>{job.deadline ? new Date(job.deadline).toLocaleDateString() : "Open"}</dd></div>
            <div><dt>Posted</dt><dd>{new Date(job.createdAt).toLocaleDateString()}</dd></div>
          </dl>
          {actions?.(job)}
        </>
      )}
    </Modal>
  );
}
