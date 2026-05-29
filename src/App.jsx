import { useState } from "react";
import Campaign from "./components/Campaign";
import Players from "./components/Players";
import Aliens from "./components/Aliens";
import CombatLog from "./components/CombatLog";
import "./App.css";

const TABS = [
  { id: "campaign", label: "⚔️ Campaign" },
  { id: "players", label: "🧙 Players" },
  { id: "aliens", label: "👽 Aliens" },
  { id: "combat", label: "📜 Combat Log" },
];

export default function App() {
  const [tab, setTab] = useState("campaign");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ben-10 D&amp;D Tracker</h1>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {tab === "campaign" && <Campaign />}
        {tab === "players" && <Players />}
        {tab === "aliens" && <Aliens />}
        {tab === "combat" && <CombatLog />}
      </main>
    </div>
  );
}
