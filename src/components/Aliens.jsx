import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = { id: "", name: "", hp: "", ac: "", cr: "", attacks: "" };

function toForm(a) {
  return { ...a, attacks: Array.isArray(a.attacks) ? a.attacks.join(", ") : a.attacks || "" };
}
function fromForm(f) {
  return { ...f, attacks: f.attacks ? f.attacks.split(",").map((s) => s.trim()) : [] };
}

export default function Aliens() {
  const [aliens, setAliens] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setAliens(await api.getAliens()); }
    catch (e) { setError(e.message); }
  }

  async function create() {
    try {
      await api.createAlien(fromForm(newForm));
      setNewForm(EMPTY);
      setShowNew(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function save(id) {
    try {
      const { id: _, ...data } = fromForm(editForm);
      await api.updateAlien(id, data);
      setEditingId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm(`Delete alien "${id}"?`)) return;
    try { await api.deleteAlien(id); load(); }
    catch (e) { setError(e.message); }
  }

  const fields = ["name", "hp", "ac", "cr", "attacks"];

  return (
    <div>
      <div className="section-header">
        <h2>Alien Database</h2>
        <button className="btn btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ Add Alien"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {showNew && (
        <div className="card new-form">
          <h3>New Alien</h3>
          <div className="form-grid">
            {["id", ...fields].map((f) => (
              <label key={f}>
                <span>{f}{f === "attacks" ? " (comma-sep)" : ""}</span>
                <input value={newForm[f]} onChange={(e) => setNewForm({ ...newForm, [f]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={create}>Create</button>
        </div>
      )}

      <div className="cards-list">
        {aliens.map((a) => (
          <div key={a.id} className="card alien-card">
            {editingId === a.id ? (
              <>
                <div className="form-grid">
                  {fields.map((f) => (
                    <label key={f}>
                      <span>{f}{f === "attacks" ? " (comma-sep)" : ""}</span>
                      <input value={editForm[f] ?? ""} onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })} />
                    </label>
                  ))}
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary" onClick={() => save(a.id)}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="card-header">
                  <div>
                    <h3>{a.name || a.id}</h3>
                    <span className="badge alien-badge">CR {a.cr ?? "?"}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn btn-secondary" onClick={() => { setEditingId(a.id); setEditForm(toForm(a)); }}>Edit</button>
                    <button className="btn btn-danger" onClick={() => remove(a.id)}>Delete</button>
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat"><span>HP</span><strong>{a.hp}</strong></div>
                  <div className="stat"><span>AC</span><strong>{a.ac}</strong></div>
                </div>
                {a.attacks?.length > 0 && (
                  <div className="attacks">
                    <span>Attacks: </span>
                    {a.attacks.map((atk) => <span key={atk} className="attack-tag">{atk}</span>)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
