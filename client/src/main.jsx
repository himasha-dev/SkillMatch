import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Target, LogOut, GraduationCap, Building2, ShieldCheck } from "lucide-react";
import { api } from "./api.js";
import { ToastProvider } from "./components/ui.jsx";
import Home from "./pages/Home.jsx";
import Auth from "./pages/Auth.jsx";
import Student from "./pages/Student.jsx";
import Company from "./pages/Company.jsx";
import Admin from "./pages/Admin.jsx";
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
  const [view, setView] = useState("home"); // home | login | register (logged-out only)

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api("/auth/me")
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">SkillMatch</div>;
  if (!user) {
    if (view === "home") return <Home onSignIn={() => setView("login")} onRegister={() => setView("register")} />;
    return <Auth initialLogin={view === "login"} onLogin={setUser} onBack={() => setView("home")} />;
  }
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setView("home");
  };
  return (
    <Shell user={user} onLogout={logout}>
      {user.role === "student" ? <Student /> : user.role === "company" ? <Company /> : <Admin />}
    </Shell>
  );
}

createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <App />
  </ToastProvider>,
);
