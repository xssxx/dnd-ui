const BASE = "";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  // Campaign (singleton)
  getCampaign: () => req("GET", "/campaign"),
  updateCampaign: (data) => req("PUT", "/campaign", data),

  // Players
  getPlayers: () => req("GET", "/players"),
  createPlayer: (data) => req("POST", "/players", data),
  updatePlayer: (id, data) => req("PUT", `/players/${id}`, data),
  deletePlayer: (id) => req("DELETE", `/players/${id}`),

  // Aliens
  getAliens: () => req("GET", "/aliens"),
  createAlien: (data) => req("POST", "/aliens", data),
  updateAlien: (id, data) => req("PUT", `/aliens/${id}`, data),
  deleteAlien: (id) => req("DELETE", `/aliens/${id}`),

  // Combat Log
  getCombatLogs: () => req("GET", "/combat-log"),
  createCombatLog: (data) => req("POST", "/combat-log", data),
  updateCombatLog: (id, data) => req("PUT", `/combat-log/${id}`, data),
  deleteCombatLog: (id) => req("DELETE", `/combat-log/${id}`),
};
