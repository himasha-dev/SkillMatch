import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api.js";
import Auth from "./pages/Auth.jsx";
import "./style.css";

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
    <div className="wrap">
      <h1>Welcome, {user.name}</h1>
      <p>You are signed in as a {user.role}.</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
