import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = { id: "", name: "", class: "", level: "", hp: "", maxHp: "", ac: "" };

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setPlayers(await api.getPlayers()); }
    catch (e) { setError(e.message); }
  }

  async function create() {
    try {
      await api.createPlayer(newForm);
      setNewForm(EMPTY);
      setShowNew(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function save(id) {
    try {
      const { id: _, ...data } = editForm;
      await api.updatePlayer(id, data);
      setEditingId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm(`Delete player "${id}"?`)) return;
    try { await api.deletePlayer(id); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="section-header">
        <h2>Players</h2>
        <button className="btn btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ Add Player"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {showNew && (
        <div className="card new-form">
          <h3>New Player</h3>
          <div className="form-grid">
            {Object.keys(EMPTY).map((f) => (
              <label key={f}>
                <span>{f}</span>
                <input value={newForm[f]} onChange={(e) => setNewForm({ ...newForm, [f]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={create}>Create</button>
        </div>
      )}

      <div className="cards-list">
        {players.map((p) => (
          <div key={p.id} className="card player-card">
            {editingId === p.id ? (
              <>
                <div className="form-grid">
                  {["name", "class", "level", "hp", "maxHp", "ac"].map((f) => (
                    <label key={f}>
                      <span>{f}</span>
                      <input value={editForm[f] ?? ""} onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })} />
                    </label>
                  ))}
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary" onClick={() => save(p.id)}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="card-header">
                  <div>
                    <h3>{p.name || p.id}</h3>
                    <span className="badge">{p.class}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn btn-secondary" onClick={() => { setEditingId(p.id); setEditForm(p); }}>Edit</button>
                    <button className="btn btn-danger" onClick={() => remove(p.id)}>Delete</button>
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat"><span>Level</span><strong>{p.level}</strong></div>
                  <div className="stat"><span>HP</span><strong>{p.hp} / {p.maxHp}</strong></div>
                  <div className="stat"><span>AC</span><strong>{p.ac}</strong></div>
                </div>
                <div className="hp-bar">
                  <div className="hp-fill" style={{ width: `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%` }} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
