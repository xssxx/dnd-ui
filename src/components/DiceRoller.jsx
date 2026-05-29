import { useState, useRef, useEffect, useCallback } from "react";
import "./DiceRoller.css";

const DICE = [
  { sides: 4,  label: "D4"  },
  { sides: 6,  label: "D6"  },
  { sides: 8,  label: "D8"  },
  { sides: 10, label: "D10" },
  { sides: 12, label: "D12" },
  { sides: 20, label: "D20" },
];

// ── 3-D math helpers ──────────────────────────────────────────────────────────

function rotX(v, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1]*c - v[2]*s, v[1]*s + v[2]*c];
}
function rotY(v, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0]*c + v[2]*s, v[1], -v[0]*s + v[2]*c];
}
function rotZ(v, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0]*c - v[1]*s, v[0]*s + v[1]*c, v[2]];
}

function project(v, cx, cy, fov = 4) {
  const z = v[2] + fov;
  const scale = fov / z;
  return [cx + v[0] * scale * cx * 0.85, cy + v[1] * scale * cy * 0.85];
}

function cross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ];
}
function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

// ── D6 pip layouts ────────────────────────────────────────────────────────────

const PIP_LAYOUTS = {
  1: [[0, 0]],
  2: [[-0.35, -0.35], [0.35, 0.35]],
  3: [[-0.35, -0.35], [0, 0], [0.35, 0.35]],
  4: [[-0.35,-0.35],[0.35,-0.35],[-0.35,0.35],[0.35,0.35]],
  5: [[-0.35,-0.35],[0.35,-0.35],[0,0],[-0.35,0.35],[0.35,0.35]],
  6: [[-0.35,-0.38],[0.35,-0.38],[-0.35,0],[ 0.35,0],[-0.35,0.38],[0.35,0.38]],
};

// Cube faces: vertex indices + which pip value is on that face
// vertices ordered so face normal points outward
const CUBE_VERTICES = [
  [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1], // back
  [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1], // front
];

// [vertexIndices, faceValue]
// Opposite faces sum to 7 (standard die)
const CUBE_FACES = [
  { vi: [4,5,6,7], val: 6 }, // front  (+z)
  { vi: [1,0,3,2], val: 1 }, // back   (-z)
  { vi: [0,1,5,4], val: 2 }, // bottom (-y)
  { vi: [3,7,6,2], val: 5 }, // top    (+y)
  { vi: [0,4,7,3], val: 3 }, // left   (-x)
  { vi: [1,2,6,5], val: 4 }, // right  (+x)
];

// ── Polyhedra definitions for non-D6 ─────────────────────────────────────────

function tetrahedron() {
  const s = 1.4;
  const v = [
    [0, s, 0],
    [-s, -s*0.5, s*0.87],
    [s, -s*0.5, s*0.87],
    [0, -s*0.5, -s*1.15],
  ];
  const faces = [
    { vi: [0,1,2] },
    { vi: [0,2,3] },
    { vi: [0,3,1] },
    { vi: [1,3,2] },
  ];
  return { v, faces };
}

function octahedron() {
  const s = 1.3;
  const v = [
    [0,s,0],[s,0,0],[0,0,s],[-s,0,0],[0,0,-s],[0,-s,0]
  ];
  const faces = [
    { vi:[0,1,2] },{ vi:[0,2,3] },{ vi:[0,3,4] },{ vi:[0,4,1] },
    { vi:[5,2,1] },{ vi:[5,3,2] },{ vi:[5,4,3] },{ vi:[5,1,4] },
  ];
  return { v, faces };
}

function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const s = 0.95;
  const rawV = [
    [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],
    [0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],
    [t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1],
  ].map(p => { const l = Math.sqrt(p[0]**2+p[1]**2+p[2]**2); return p.map(x=>x/l*s); });
  const faces = [
    {vi:[0,11,5]},{vi:[0,5,1]},{vi:[0,1,7]},{vi:[0,7,10]},{vi:[0,10,11]},
    {vi:[1,5,9]},{vi:[5,11,4]},{vi:[11,10,2]},{vi:[10,7,6]},{vi:[7,1,8]},
    {vi:[3,9,4]},{vi:[3,4,2]},{vi:[3,2,6]},{vi:[3,6,8]},{vi:[3,8,9]},
    {vi:[4,9,5]},{vi:[2,4,11]},{vi:[6,2,10]},{vi:[8,6,7]},{vi:[9,8,1]},
  ];
  return { v: rawV, faces };
}

// Approximate D10/D12 with dodecahedron-like shape
function dodecahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const s = 0.7;
  const rawV = [
    [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
    [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
    [0,1/phi,phi],[0,-1/phi,phi],[0,1/phi,-phi],[0,-1/phi,-phi],
    [1/phi,phi,0],[-1/phi,phi,0],[1/phi,-phi,0],[-1/phi,-phi,0],
    [phi,0,1/phi],[phi,0,-1/phi],[-phi,0,1/phi],[-phi,0,-1/phi],
  ].map(p => { const l=Math.sqrt(p[0]**2+p[1]**2+p[2]**2); return p.map(x=>x/l*s); });
  const faces = [
    {vi:[0,8,9,2,16]},{vi:[0,16,17,1,12]},{vi:[0,12,13,4,8]},
    {vi:[1,17,3,11,10]},{vi:[1,10,5,13,12]},
    {vi:[2,9,6,15,14]},{vi:[2,14,3,17,16]},
    {vi:[3,14,15,7,11]},{vi:[4,13,5,19,18]},{vi:[4,18,6,9,8]},
    {vi:[5,10,11,7,19]},{vi:[6,18,19,7,15]},
  ];
  return { v: rawV, faces };
}

// ── Canvas 3-D die renderer ───────────────────────────────────────────────────

function drawPolyDie(ctx, size, rx, ry, rz, value, sides, settled) {
  const cx = size / 2, cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  let geom;
  if (sides === 4) geom = tetrahedron();
  else if (sides === 8) geom = octahedron();
  else if (sides === 10) geom = dodecahedron();
  else if (sides === 12) geom = dodecahedron();
  else geom = icosahedron(); // 20

  const rotated = geom.v.map(v => {
    let p = rotX(v, rx);
    p = rotY(p, ry);
    p = rotZ(p, rz);
    return p;
  });

  // compute face normals + z centers
  const facesData = geom.faces.map((f, i) => {
    const pts = f.vi.map(j => rotated[j]);
    const zCenter = pts.reduce((s, p) => s + p[2], 0) / pts.length;
    const a = sub(pts[1], pts[0]);
    const b = sub(pts[2], pts[0]);
    const n = cross(a, b);
    const visible = dot(n, [0, 0, 1]) > 0;
    return { pts, zCenter, visible, idx: i };
  });

  facesData.sort((a, b) => a.zCenter - b.zCenter);

  const totalFaces = geom.faces.length;

  facesData.forEach((fd, drawIdx) => {
    const proj = fd.pts.map(p => project(p, cx, cy));
    const isFront = drawIdx === facesData.length - 1;

    ctx.beginPath();
    ctx.moveTo(proj[0][0], proj[0][1]);
    for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i][0], proj[i][1]);
    ctx.closePath();

    const brightness = 0.3 + (drawIdx / totalFaces) * 0.7;
    if (isFront && settled) {
      ctx.fillStyle = `rgba(13,42,20,0.95)`;
    } else {
      const g = Math.floor(brightness * 30);
      ctx.fillStyle = `rgb(0,${g},${Math.floor(g*0.5)})`;
    }
    ctx.fill();

    ctx.strokeStyle = settled && isFront ? "#1fff6e" : `rgba(31,255,110,${0.15 + brightness * 0.5})`;
    ctx.lineWidth = isFront && settled ? 1.5 : 0.8;
    ctx.stroke();

    // Draw value on front face
    if (isFront && value !== null) {
      const centX = proj.reduce((s, p) => s + p[0], 0) / proj.length;
      const centY = proj.reduce((s, p) => s + p[1], 0) / proj.length;
      ctx.fillStyle = "#1fff6e";
      ctx.font = `bold ${size * 0.22}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#1fff6e";
      ctx.shadowBlur = 8;
      ctx.fillText(String(value), centX, centY);
      ctx.shadowBlur = 0;
    }
  });
}

function drawD6(ctx, size, rx, ry, rz, value, settled) {
  const cx = size / 2, cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  const rotated = CUBE_VERTICES.map(v => {
    let p = rotX(v, rx);
    p = rotY(p, ry);
    p = rotZ(p, rz);
    return p;
  });

  const facesData = CUBE_FACES.map((f) => {
    const pts = f.vi.map(j => rotated[j]);
    const zCenter = pts.reduce((s, p) => s + p[2], 0) / 4;
    const a = sub(pts[1], pts[0]);
    const b = sub(pts[2], pts[0]);
    const n = cross(a, b);
    const visible = dot(n, [0, 0, 1]) > 0;
    return { pts, zCenter, visible, val: f.val };
  });

  facesData.sort((a, b) => a.zCenter - b.zCenter);

  facesData.forEach((fd, drawIdx) => {
    if (!fd.visible) return;
    const proj = fd.pts.map(p => project(p, cx, cy));
    const isFront = drawIdx === facesData.length - 1;
    const brightness = 0.3 + (drawIdx / 6) * 0.7;

    ctx.beginPath();
    ctx.moveTo(proj[0][0], proj[0][1]);
    proj.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();

    if (isFront && settled) {
      ctx.fillStyle = `rgba(13,42,20,0.95)`;
    } else {
      const g = Math.floor(brightness * 30);
      ctx.fillStyle = `rgb(0,${g},${Math.floor(g * 0.5)})`;
    }
    ctx.fill();
    ctx.strokeStyle = settled && isFront ? "#1fff6e" : `rgba(31,255,110,${0.2 + brightness * 0.5})`;
    ctx.lineWidth = isFront && settled ? 1.5 : 0.8;
    ctx.stroke();

    // Pips / value on front face
    if (isFront && value !== null) {
      const displayVal = fd.val; // show the face value that's facing front
      const pips = PIP_LAYOUTS[displayVal] || PIP_LAYOUTS[1];
      // compute face size in screen space
      const dx = proj[1][0] - proj[0][0];
      const dy = proj[1][1] - proj[0][1];
      const faceW = Math.sqrt(dx*dx+dy*dy) * 0.38;
      const centX = proj.reduce((s, p) => s + p[0], 0) / 4;
      const centY = proj.reduce((s, p) => s + p[1], 0) / 4;

      ctx.fillStyle = "#1fff6e";
      ctx.shadowColor = "#1fff6e";
      ctx.shadowBlur = 6;
      pips.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(centX + px * faceW, centY + py * faceW, Math.max(3, faceW * 0.18), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }
  });
}

// ── Canvas die component ──────────────────────────────────────────────────────

function CanvasDie({ sides, value, rolling, size = 80 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({ rx: 0.5, ry: 0.5, rz: 0.2, vx: 0, vy: 0, vz: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;

    if (sides === 6) {
      drawD6(ctx, size, s.rx, s.ry, s.rz, value, !rolling);
    } else {
      drawPolyDie(ctx, size, s.rx, s.ry, s.rz, value, sides, !rolling);
    }
  }, [sides, value, rolling, size]);

  useEffect(() => {
    const s = stateRef.current;

    if (rolling) {
      s.vx = (Math.random() - 0.5) * 0.25;
      s.vy = (Math.random() - 0.5) * 0.25;
      s.vz = (Math.random() - 0.5) * 0.12;

      const animate = () => {
        s.vx += (Math.random() - 0.5) * 0.04;
        s.vy += (Math.random() - 0.5) * 0.04;
        s.rx += s.vx;
        s.ry += s.vy;
        s.rz += s.vz;
        draw();
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafRef.current);
      // Ease to a nice display angle
      let t = 0;
      const fromRx = s.rx, fromRy = s.ry, fromRz = s.rz;
      const toRx = 0.4, toRy = 0.6, toRz = 0.2;
      const ease = () => {
        t += 0.06;
        if (t >= 1) { s.rx=toRx; s.ry=toRy; s.rz=toRz; draw(); return; }
        const e = 1 - (1-t)*(1-t);
        s.rx = fromRx + (toRx - fromRx) * e;
        s.ry = fromRy + (toRy - fromRy) * e;
        s.rz = fromRz + (toRz - fromRz) * e;
        draw();
        rafRef.current = requestAnimationFrame(ease);
      };
      rafRef.current = requestAnimationFrame(ease);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [rolling, draw]);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  return <canvas ref={canvasRef} width={size} height={size} className="die-canvas" />;
}

// ── Selector card ─────────────────────────────────────────────────────────────

function DieCard({ sides, label, count, onCountChange }) {
  return (
    <div className="die-card">
      <CanvasDie sides={sides} value={null} rolling={false} size={72} />
      <div className="die-label">{label}</div>
      <div className="die-count-ctrl">
        <button className="count-btn" onClick={() => onCountChange(Math.max(0, count - 1))}>−</button>
        <span className="count-val">{count}</span>
        <button className="count-btn" onClick={() => onCountChange(Math.min(10, count + 1))}>+</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DiceRoller() {
  const [counts, setCounts] = useState({ 4:0,6:0,8:0,10:0,12:0,20:0 });
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState(null);
  const timerRef = useRef(null);

  function setCount(sides, val) {
    setCounts(c => ({ ...c, [sides]: val }));
  }

  function roll() {
    const active = DICE.filter(d => counts[d.sides] > 0);
    if (!active.length) return;

    setRolling(true);
    setResults(null);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rolled = [];
      for (const d of DICE) {
        const n = counts[d.sides];
        if (!n) continue;
        for (let i = 0; i < n; i++) {
          rolled.push({ sides: d.sides, label: d.label, value: Math.ceil(Math.random() * d.sides) });
        }
      }
      setResults(rolled);
      setRolling(false);
    }, 1100);
  }

  const total = results ? results.reduce((s, r) => s + r.value, 0) : null;
  const anySelected = DICE.some(d => counts[d.sides] > 0);

  // dice to show while rolling
  const rollingDice = DICE.flatMap(d =>
    Array.from({ length: counts[d.sides] }, (_, i) => ({ ...d, key: `${d.sides}-${i}` }))
  );

  return (
    <div className="dice-roller">
      <div className="section-header">
        <h2>Dice Roller</h2>
        {anySelected && (
          <button className="btn btn-primary" onClick={roll} disabled={rolling}>
            {rolling ? "Rolling…" : "🎲 Roll"}
          </button>
        )}
      </div>

      <div className="dice-grid">
        {DICE.map(d => (
          <DieCard
            key={d.sides}
            {...d}
            count={counts[d.sides]}
            onCountChange={v => setCount(d.sides, v)}
          />
        ))}
      </div>

      {(rolling || results) && (
        <div className="results-panel">
          {rolling ? (
            <div className="results-rolling">
              {rollingDice.map(d => (
                <CanvasDie key={d.key} sides={d.sides} value={null} rolling size={80} />
              ))}
            </div>
          ) : (
            <>
              <div className="results-dice">
                {results.map((r, i) => (
                  <div key={i} className="result-item">
                    <CanvasDie sides={r.sides} value={r.value} rolling={false} size={80} />
                    <span className="result-label">{r.label} · {r.value}</span>
                  </div>
                ))}
              </div>
              <div className="results-total">
                Total: <span>{total}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
