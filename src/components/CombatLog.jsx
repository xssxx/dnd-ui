import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = { session_id: "", date: "", participants: "", rounds: "", outcome: "", notes: "" };

function toForm(l) {
  return { ...l, participants: Array.isArray(l.participants) ? l.participants.join(", ") : l.participants || "" };
}
function fromForm(f) {
  return { ...f, participants: f.participants ? f.participants.split(",").map((s) => s.trim()) : [] };
}

export default function CombatLog() {
  const [logs, setLogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setLogs(await api.getCombatLogs()); }
    catch (e) { setError(e.message); }
  }

  async function create() {
    try {
      await api.createCombatLog(fromForm(newForm));
      setNewForm(EMPTY);
      setShowNew(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function save(id) {
    try {
      const { session_id: _, ...data } = fromForm(editForm);
      await api.updateCombatLog(id, data);
      setEditingId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm(`Delete combat log "${id}"?`)) return;
    try { await api.deleteCombatLog(id); load(); }
    catch (e) { setError(e.message); }
  }

  const editFields = ["date", "participants", "rounds", "outcome", "notes"];

  return (
    <div>
      <div className="section-header">
        <h2>Combat Log</h2>
        <button className="btn btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ Add Log"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {showNew && (
        <div className="card new-form">
          <h3>New Combat Log</h3>
          <div className="form-grid">
            {Object.keys(EMPTY).map((f) => (
              <label key={f}>
                <span>{f}{f === "participants" ? " (comma-sep)" : ""}</span>
                {f === "notes" ? (
                  <textarea value={newForm[f]} onChange={(e) => setNewForm({ ...newForm, [f]: e.target.value })} />
                ) : (
                  <input value={newForm[f]} onChange={(e) => setNewForm({ ...newForm, [f]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={create}>Create</button>
        </div>
      )}

      <div className="cards-list">
        {logs.sort((a, b) => (b.date > a.date ? 1 : -1)).map((l) => (
          <div key={l.session_id} className="card log-card">
            {editingId === l.session_id ? (
              <>
                <div className="form-grid">
                  {editFields.map((f) => (
                    <label key={f}>
                      <span>{f}{f === "participants" ? " (comma-sep)" : ""}</span>
                      {f === "notes" ? (
                        <textarea value={editForm[f] ?? ""} onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })} />
                      ) : (
                        <input value={editForm[f] ?? ""} onChange={(e) => setEditForm({ ...editForm, [f]: e.target.value })} />
                      )}
                    </label>
                  ))}
                </div>
                <div className="card-actions">
                  <button className="btn btn-primary" onClick={() => save(l.session_id)}>Save</button>
                  <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="card-header">
                  <div>
                    <h3>{l.session_id}</h3>
                    <span className="badge outcome-badge">{l.outcome}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn btn-secondary" onClick={() => { setEditingId(l.session_id); setEditForm(toForm(l)); }}>Edit</button>
                    <button className="btn btn-danger" onClick={() => remove(l.session_id)}>Delete</button>
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat"><span>Date</span><strong>{l.date || "—"}</strong></div>
                  <div className="stat"><span>Rounds</span><strong>{l.rounds ?? "—"}</strong></div>
                </div>
                {l.participants?.length > 0 && (
                  <div className="attacks">
                    <span>Participants: </span>
                    {l.participants.map((p) => <span key={p} className="attack-tag">{p}</span>)}
                  </div>
                )}
                {l.notes && <p className="log-notes">{l.notes}</p>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
