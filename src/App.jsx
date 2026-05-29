import { useState } from "react";
import Campaign from "./components/Campaign";
import Players from "./components/Players";
import Aliens from "./components/Aliens";
import CombatLog from "./components/CombatLog";
import DiceRoller from "./components/DiceRoller";
import "./App.css";

const TABS = [
  { id: "campaign", label: "⚔️ Campaign" },
  { id: "players",  label: "🧙 Players"  },
  { id: "aliens",   label: "👽 Aliens"   },
  { id: "combat",   label: "📜 Combat Log" },
  { id: "dice",     label: "🎲 Dice"     },
];

function OmnitrixIcon() {
  return (
    <svg className="omnitrix-icon" width="36" height="36" viewBox="0 0 36 36" fill="none">
      {/* outer ring */}
      <circle cx="18" cy="18" r="17" stroke="#1fff6e" strokeWidth="2" fill="#050d07" />
      {/* middle ring */}
      <circle cx="18" cy="18" r="13" fill="#0a1f0d" stroke="#0ebd4e" strokeWidth="1" />
      {/* inner circle (face) */}
      <circle cx="18" cy="18" r="9" fill="#1fff6e" />
      {/* hourglass symbol */}
      <polygon points="18,10.5 23.5,14.5 18,18 12.5,14.5" fill="#020d04" />
      <polygon points="18,25.5 12.5,21.5 18,18 23.5,21.5" fill="#020d04" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("campaign");

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <OmnitrixIcon />
          <h1>Ben-10 D&amp;D Tracker</h1>
        </div>
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
        {tab === "players"  && <Players />}
        {tab === "aliens"   && <Aliens />}
        {tab === "combat"   && <CombatLog />}
        {tab === "dice"     && <DiceRoller />}
      </main>
    </div>
  );
}
