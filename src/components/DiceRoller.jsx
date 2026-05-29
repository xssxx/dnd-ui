import { useState, useRef } from "react";
import "./DiceRoller.css";

const DICE = [
  { sides: 4,  label: "D4",  shape: "triangle" },
  { sides: 6,  label: "D6",  shape: "square"   },
  { sides: 8,  label: "D8",  shape: "diamond"  },
  { sides: 10, label: "D10", shape: "kite"     },
  { sides: 12, label: "D12", shape: "pentagon" },
  { sides: 20, label: "D20", shape: "triangle" },
];

function DieSVG({ shape, sides, value, rolling }) {
  const size = 72;
  const cx = size / 2;
  const cy = size / 2;

  let polyPoints = "";
  if (shape === "triangle") {
    // equilateral triangle pointing up
    polyPoints = `${cx},6 ${size - 6},${size - 8} 6,${size - 8}`;
  } else if (shape === "square") {
    polyPoints = `8,8 ${size - 8},8 ${size - 8},${size - 8} 8,${size - 8}`;
  } else if (shape === "diamond") {
    polyPoints = `${cx},5 ${size - 6},${cy} ${cx},${size - 5} 6,${cy}`;
  } else if (shape === "kite") {
    polyPoints = `${cx},5 ${size - 8},${cy - 4} ${size - 12},${size - 8} 12,${size - 8} 8,${cy - 4}`;
  } else if (shape === "pentagon") {
    const r = 30;
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    }
    polyPoints = pts.join(" ");
  }

  const hasValue = value !== null;
  const faceColor = rolling ? "#1fff6e" : hasValue ? "#0d2a14" : "#0a1a0d";
  const strokeColor = rolling ? "#1fff6e" : hasValue ? "#1fff6e" : "#1a4028";
  const textColor = rolling ? "#020d04" : hasValue ? "#1fff6e" : "#c8f0d8";

  return (
    <svg
      className={`die-svg${rolling ? " rolling" : ""}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <polygon
        points={polyPoints}
        fill={faceColor}
        stroke={strokeColor}
        strokeWidth="2"
        style={{ transition: "fill 0.2s" }}
      />
      <text
        x={cx}
        y={shape === "triangle" && sides === 4 ? cy + 10 : cy + 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={value !== null ? "18" : "12"}
        fontWeight="700"
        fontFamily="inherit"
        style={{ transition: "fill 0.2s" }}
      >
        {value !== null ? value : `d${sides}`}
      </text>
    </svg>
  );
}

function DieCard({ sides, label, shape, count, onCountChange }) {
  return (
    <div className="die-card">
      <DieSVG shape={shape} sides={sides} value={null} rolling={false} />
      <div className="die-label">{label}</div>
      <div className="die-count-ctrl">
        <button className="count-btn" onClick={() => onCountChange(Math.max(0, count - 1))}>−</button>
        <span className="count-val">{count}</span>
        <button className="count-btn" onClick={() => onCountChange(Math.min(10, count + 1))}>+</button>
      </div>
    </div>
  );
}

export default function DiceRoller() {
  const [counts, setCounts] = useState({ 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 });
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState(null);
  const timerRef = useRef(null);

  function setCount(sides, val) {
    setCounts((c) => ({ ...c, [sides]: val }));
  }

  function roll() {
    const active = DICE.filter((d) => counts[d.sides] > 0);
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
          rolled.push({ sides: d.sides, label: d.label, shape: d.shape, value: Math.ceil(Math.random() * d.sides) });
        }
      }
      setResults(rolled);
      setRolling(false);
    }, 900);
  }

  const total = results ? results.reduce((s, r) => s + r.value, 0) : null;
  const anySelected = DICE.some((d) => counts[d.sides] > 0);

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
        {DICE.map((d) => (
          <DieCard
            key={d.sides}
            {...d}
            count={counts[d.sides]}
            onCountChange={(v) => setCount(d.sides, v)}
          />
        ))}
      </div>

      {(rolling || results) && (
        <div className="results-panel">
          {rolling ? (
            <div className="results-rolling">
              {DICE.flatMap((d) =>
                Array.from({ length: counts[d.sides] }, (_, i) => (
                  <DieSVG key={`${d.sides}-${i}`} shape={d.shape} sides={d.sides} value={null} rolling />
                ))
              )}
            </div>
          ) : (
            <>
              <div className="results-dice">
                {results.map((r, i) => (
                  <div key={i} className="result-item">
                    <DieSVG shape={r.shape} sides={r.sides} value={r.value} rolling={false} />
                    <span className="result-label">{r.label}</span>
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
