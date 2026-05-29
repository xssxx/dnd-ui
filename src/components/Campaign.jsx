import { useEffect, useState } from "react";
import { api } from "../api";

export default function Campaign() {
  const [campaign, setCampaign] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api.getCampaign();
      setCampaign(data);
      setForm(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function save() {
    try {
      await api.updateCampaign(form);
      setEditing(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!campaign) return <p className="loading">Loading campaign…</p>;

  return (
    <div className="card campaign-card">
      <div className="card-header">
        <h2>{campaign.name || "Unnamed Campaign"}</h2>
        <button onClick={() => setEditing(!editing)} className="btn btn-secondary">
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="form-grid">
          {["name", "session", "currentLocation", "notes"].map((field) => (
            <label key={field}>
              <span>{field}</span>
              {field === "notes" ? (
                <textarea
                  value={form[field] || ""}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              ) : (
                <input
                  value={form[field] || ""}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              )}
            </label>
          ))}
          <button onClick={save} className="btn btn-primary">Save</button>
        </div>
      ) : (
        <div className="stat-grid">
          <div className="stat"><span>Session</span><strong>{campaign.session ?? "—"}</strong></div>
          <div className="stat"><span>Location</span><strong>{campaign.currentLocation ?? "—"}</strong></div>
          <div className="stat full"><span>Notes</span><strong>{campaign.notes ?? "—"}</strong></div>
        </div>
      )}
    </div>
  );
}
