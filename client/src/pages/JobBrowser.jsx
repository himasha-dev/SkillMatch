import React, { useEffect, useState } from "react";
import { Briefcase, Eye, Pencil, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { api, qs } from "../api.js";
import { DEGREES, Empty, Tags } from "../components/ui.jsx";

// Lists job records with search, filter, sort and pagination (READ).
export default function JobBrowser({ mode, reloadKey, appliedIds = [], onView, onEdit, onDelete, onApply, onTotal }) {
  const [filters, setFilters] = useState({ search: "", location: "", degree: "", status: "", sort: "newest" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [debounced, setDebounced] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api("/internships" + qs({ ...filters, search: debounced, page, limit: 6 }))
      .then((d) => {
        if (!live) return;
        setData(d);
        setError("");
        onTotal?.(d.total);
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [debounced, filters.location, filters.degree, filters.status, filters.sort, page, reloadKey]);

  const change = (k) => (e) => {
    setFilters({ ...filters, [k]: e.target.value });
    setPage(1);
  };
  const reset = () => {
    setFilters({ search: "", location: "", degree: "", status: "", sort: "newest" });
    setPage(1);
  };
  const filtered = filters.search || filters.location || filters.degree || filters.status;

  return (
    <>
      <div className="toolbar card">
        <div className="searchbox">
          <Search />
          <input placeholder="Search title, description or skill" value={filters.search} onChange={change("search")} aria-label="Search jobs" />
        </div>
        <input placeholder="Location" value={filters.location} onChange={change("location")} aria-label="Filter by location" />
        <select value={filters.degree} onChange={change("degree")} aria-label="Filter by degree">
          <option value="">Any degree</option>
          {DEGREES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        {mode === "company" && (
          <select value={filters.status} onChange={change("status")} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        )}
        <select value={filters.sort} onChange={change("sort")} aria-label="Sort jobs">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
          <option value="deadline">Deadline soonest</option>
          <option value="openings">Most openings</option>
          <option value="gpa">Lowest GPA requirement</option>
        </select>
        {filtered && (
          <button className="secondary" onClick={reset}>
            Clear
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <p className="count">{loading ? "Loading..." : `${data.total} job${data.total === 1 ? "" : "s"} found`}</p>
      <div className="cards">
        {!loading && !data.items.length && (
          <Empty text={filtered ? "No jobs match your search or filters." : mode === "company" ? "You have not posted any jobs yet." : "No open jobs right now."} />
        )}
        {data.items.map((j) => {
          const applied = appliedIds.includes(j._id);
          return (
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
              <div className="row jobactions">
                <button className="secondary" onClick={() => onView(j)}>
                  <Eye /> Details
                </button>
                {mode === "student" && (
                  <button disabled={applied} onClick={() => onApply(j)}>
                    {applied ? "Applied" : "Apply now"}
                  </button>
                )}
                {mode === "company" && (
                  <>
                    <button className="secondary" onClick={() => onEdit(j)} aria-label={`Edit ${j.title}`}>
                      <Pencil /> Edit
                    </button>
                    <button className="danger" onClick={() => onDelete(j)} aria-label={`Delete ${j.title}`}>
                      <Trash2 /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {data.pages > 1 && (
        <div className="pager">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft /> Prev
          </button>
          <span>
            Page {page} of {data.pages}
          </span>
          <button className="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight />
          </button>
        </div>
      )}
    </>
  );
}
