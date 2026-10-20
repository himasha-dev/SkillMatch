import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Target, LogOut, GraduationCap, Building2, ShieldCheck } from "lucide-react";
import { api } from "./api.js";
import Auth from "./pages/Auth.jsx";
import Company from "./pages/Company.jsx";
import "./style.css";

const RoleIcon = ({ role }) =>
  role === "student" ? <GraduationCap /> : role === "company" ? <Building2 /> : <ShieldCheck />;

function Shell({ user, onLogout, children }) {
  return (
    <>
      <header>
        <div className="brand">
          <span>
            <Target />
          </span>{" "}
          SkillMatch
        </div>
        <div className="identity">
          <div>
            <b>{user.name}</b>
            <small>{user.role === "student" ? "candidate" : user.role}</small>
          </div>
          <RoleIcon role={user.role} />
          <button className="iconbtn" onClick={onLogout} aria-label="Log out">
            <LogOut />
          </button>
        </div>
      </header>
      {children}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api("/auth/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">SkillMatch</div>;
  if (!user) return <Auth onLogin={setUser} />;
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };
  return (
    <Shell user={user} onLogout={logout}>
      {user.role === "company" ? <Company /> : <p className="wrap">This dashboard is coming soon.</p>}
    </Shell>
  );
}

createRoot(document.getElementById("root")).render(<App />);
