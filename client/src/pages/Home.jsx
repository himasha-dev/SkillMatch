import React from "react";
import {
  Target,
  GraduationCap,
  Building2,
  ShieldCheck,
  UserPlus,
  Search,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  { icon: UserPlus, title: "Create your account", text: "Sign up as a candidate looking for work or as a company that wants to hire." },
  { icon: Search, title: "Build profiles and listings", text: "Candidates add their degree, GPA and skills. Companies publish jobs with clear requirements." },
  { icon: Sparkles, title: "Get matched", text: "SkillMatch scores every candidate against every job and shows exactly why they fit." },
  { icon: ClipboardCheck, title: "Apply and track", text: "Candidates apply in one click and follow each application from submitted to offered." },
];

const ROLES = [
  {
    icon: GraduationCap,
    title: "For candidates",
    points: ["Save your qualifications once", "Search and filter open jobs", "Apply with an optional cover note", "Track every application stage", "See which skills to develop next"],
  },
  {
    icon: Building2,
    title: "For companies",
    points: ["Post, edit and close job listings", "Set required skills, degree and GPA", "Review applications in one pipeline", "Move candidates between stages", "See admin-approved best-fit candidates"],
  },
  {
    icon: ShieldCheck,
    title: "For admins",
    points: ["Generate ranked matches", "Review the score evidence", "Approve or reject each match", "Publish final results", "Monitor platform statistics"],
  },
];

const WEIGHTS = [
  ["Skills", 60],
  ["Field of study", 15],
  ["Degree level", 10],
  ["GPA", 10],
  ["Location", 5],
];

export default function Home({ onSignIn, onRegister }) {
  return (
    <div className="home">
      <header className="homebar">
        <div className="brand">
          <span>
            <Target />
          </span>{" "}
          SkillMatch
        </div>
        <nav>
          <a href="#how">How it works</a>
          <a href="#roles">Who it's for</a>
          <a href="#matching">Smart matching</a>
          <button className="secondary" onClick={onSignIn}>
            Sign in
          </button>
          <button onClick={onRegister}>Get started</button>
        </nav>
      </header>

      <section className="homehero">
        <span className="eyebrow">JOB MATCHING AND APPLICATION TRACKING</span>
        <h1>
          The right candidate. <em>The right job.</em>
        </h1>
        <p>
          SkillMatch connects qualified candidates with companies that are hiring. It compares skills,
          education and location, scores every match clearly, and keeps each application organised from
          first click to final offer.
        </p>
        <div className="row center">
          <button onClick={onRegister}>
            Create free account <ArrowRight />
          </button>
          <button className="secondary" onClick={onSignIn}>
            I already have an account
          </button>
        </div>
      </section>

      <section id="how" className="homesec">
        <h2>How it works</h2>
        <div className="homegrid four">
          {STEPS.map((s, i) => (
            <div className="card step" key={s.title}>
              <div className="stepicon">
                <s.icon />
              </div>
              <small>Step {i + 1}</small>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="homesec">
        <h2>Built for three kinds of users</h2>
        <div className="homegrid three">
          {ROLES.map((r) => (
            <div className="card role" key={r.title}>
              <div className="stepicon">
                <r.icon />
              </div>
              <h3>{r.title}</h3>
              <ul>
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="matching" className="homesec">
        <div className="card matchbox">
          <div>
            <h2>Matching you can explain</h2>
            <p>
              Every match gets a score out of 100. The score is built from five parts, so candidates and
              companies can see exactly why a match was made and which skills are still missing.
            </p>
          </div>
          <div className="weights">
            {WEIGHTS.map(([name, pts]) => (
              <div key={name}>
                <span>
                  {name} <b>{pts} pts</b>
                </span>
                <div className="bar">
                  <i style={{ width: `${pts}%` }}></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="homecta">
        <h2>Ready to find your match?</h2>
        <p>Join as a candidate or a company in under a minute.</p>
        <div className="row center">
          <button onClick={onRegister}>Get started</button>
          <button className="secondary" onClick={onSignIn}>
            Sign in
          </button>
        </div>
      </section>

      <footer className="homefoot">SkillMatch · Smart job matching and application tracking</footer>
    </div>
  );
}
