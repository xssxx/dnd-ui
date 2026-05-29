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

// ── 3-D math ──────────────────────────────────────────────────────────────────
function rotX(v,a){const c=Math.cos(a),s=Math.sin(a);return[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c];}
function rotY(v,a){const c=Math.cos(a),s=Math.sin(a);return[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c];}
function rotZ(v,a){const c=Math.cos(a),s=Math.sin(a);return[v[0]*c-v[1]*s,v[0]*s+v[1]*c,v[2]];}
function project(v,cx,cy){const z=v[2]+4,sc=4/z;return[cx+v[0]*sc*cx*0.85,cy+v[1]*sc*cy*0.85];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}

// ── Pip layouts (D6) ──────────────────────────────────────────────────────────
const PIPS={1:[[0,0]],2:[[-0.35,-0.35],[0.35,0.35]],3:[[-0.35,-0.35],[0,0],[0.35,0.35]],4:[[-0.35,-0.35],[0.35,-0.35],[-0.35,0.35],[0.35,0.35]],5:[[-0.35,-0.35],[0.35,-0.35],[0,0],[-0.35,0.35],[0.35,0.35]],6:[[-0.35,-0.38],[0.35,-0.38],[-0.35,0],[0.35,0],[-0.35,0.38],[0.35,0.38]]};

// ── Cube geometry ─────────────────────────────────────────────────────────────
const CV=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const CF=[{vi:[4,5,6,7],val:6},{vi:[1,0,3,2],val:1},{vi:[0,1,5,4],val:2},{vi:[3,7,6,2],val:5},{vi:[0,4,7,3],val:3},{vi:[1,2,6,5],val:4}];

// ── Polyhedra ─────────────────────────────────────────────────────────────────
function tetra(){const s=1.4,v=[[0,s,0],[-s,-s*.5,s*.87],[s,-s*.5,s*.87],[0,-s*.5,-s*1.15]];return{v,faces:[{vi:[0,1,2]},{vi:[0,2,3]},{vi:[0,3,1]},{vi:[1,3,2]}]};}
function octa(){const s=1.3,v=[[0,s,0],[s,0,0],[0,0,s],[-s,0,0],[0,0,-s],[0,-s,0]];return{v,faces:[{vi:[0,1,2]},{vi:[0,2,3]},{vi:[0,3,4]},{vi:[0,4,1]},{vi:[5,2,1]},{vi:[5,3,2]},{vi:[5,4,3]},{vi:[5,1,4]}]};}
function dodeca(){const phi=(1+Math.sqrt(5))/2,raw=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1/phi,phi],[0,1/phi,phi],[0,-1/phi,-phi],[0,1/phi,-phi],[1/phi,phi,0],[-1/phi,phi,0],[1/phi,-phi,0],[-1/phi,-phi,0],[phi,0,1/phi],[phi,0,-1/phi],[-phi,0,1/phi],[-phi,0,-1/phi],[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1]],v=raw.map(p=>{const l=Math.sqrt(p[0]**2+p[1]**2+p[2]**2);return p.map(x=>x/l*.75);});return{v,faces:[{vi:[0,9,14,15,7]},{vi:[0,7,17,16,8]},{vi:[0,8,1,5,9]},{vi:[1,8,16,12,2]},{vi:[1,2,4,5,9]},{vi:[2,12,13,3,10]},{vi:[2,10,11,4,5]},{vi:[3,13,17,16,12]},{vi:[3,10,11,15,14]},{vi:[4,11,15,14,6]},{vi:[4,6,13,3,10]},{vi:[6,7,17,13,3]}]};}
function icosa(){const t=(1+Math.sqrt(5))/2,raw=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]],v=raw.map(p=>{const l=Math.sqrt(p[0]**2+p[1]**2+p[2]**2);return p.map(x=>x/l*.95);});return{v,faces:[{vi:[0,11,5]},{vi:[0,5,1]},{vi:[0,1,7]},{vi:[0,7,10]},{vi:[0,10,11]},{vi:[1,5,9]},{vi:[5,11,4]},{vi:[11,10,2]},{vi:[10,7,6]},{vi:[7,1,8]},{vi:[3,9,4]},{vi:[3,4,2]},{vi:[3,2,6]},{vi:[3,6,8]},{vi:[3,8,9]},{vi:[4,9,5]},{vi:[2,4,11]},{vi:[6,2,10]},{vi:[8,6,7]},{vi:[9,8,1]}]};}

// ── Draw functions ────────────────────────────────────────────────────────────
function applyRot(verts,rx,ry,rz){return verts.map(v=>{let p=rotX(v,rx);p=rotY(p,ry);return rotZ(p,rz);});}

function renderPoly(ctx,size,rx,ry,rz,sides,value,settled){
  const cx=size/2,cy=size/2;
  ctx.clearRect(0,0,size,size);
  const geom=sides===4?tetra():sides===8?octa():sides===10||sides===12?dodeca():icosa();
  const rot=applyRot(geom.v,rx,ry,rz);
  const fds=geom.faces.map(f=>{const pts=f.vi.map(j=>rot[j]);const zc=pts.reduce((s,p)=>s+p[2],0)/pts.length;const n=cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]));return{pts,zc,vis:dot(n,[0,0,1])>0};});
  fds.sort((a,b)=>a.zc-b.zc);
  fds.forEach((fd,i)=>{
    const proj=fd.pts.map(p=>project(p,cx,cy));
    const front=i===fds.length-1;
    const br=0.25+(i/fds.length)*0.75;
    ctx.beginPath();ctx.moveTo(proj[0][0],proj[0][1]);proj.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();
    ctx.fillStyle=front&&settled?`rgb(8,30,14)`:`rgb(0,${Math.floor(br*28)},${Math.floor(br*14)})`;ctx.fill();
    ctx.strokeStyle=front&&settled?`#1fff6e`:`rgba(31,255,110,${0.15+br*0.5})`;ctx.lineWidth=front&&settled?1.5:.7;ctx.stroke();
    if(front&&value!==null){const cx2=proj.reduce((s,p)=>s+p[0],0)/proj.length,cy2=proj.reduce((s,p)=>s+p[1],0)/proj.length;ctx.fillStyle="#1fff6e";ctx.font=`bold ${size*.2}px monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.shadowColor="#1fff6e";ctx.shadowBlur=10;ctx.fillText(String(value),cx2,cy2);ctx.shadowBlur=0;}
  });
}

function renderD6(ctx,size,rx,ry,rz,value,settled){
  const cx=size/2,cy=size/2;
  ctx.clearRect(0,0,size,size);
  const rot=applyRot(CV,rx,ry,rz);
  const fds=CF.map(f=>{const pts=f.vi.map(j=>rot[j]);const zc=pts.reduce((s,p)=>s+p[2],0)/4;const n=cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]));return{pts,zc,vis:dot(n,[0,0,1])>0,val:f.val};});
  fds.sort((a,b)=>a.zc-b.zc);
  fds.forEach((fd,i)=>{
    if(!fd.vis)return;
    const proj=fd.pts.map(p=>project(p,cx,cy));
    const front=i===fds.length-1;
    const br=0.25+(i/6)*0.75;
    ctx.beginPath();ctx.moveTo(proj[0][0],proj[0][1]);proj.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.closePath();
    ctx.fillStyle=front&&settled?`rgb(8,30,14)`:`rgb(0,${Math.floor(br*28)},${Math.floor(br*14)})`;ctx.fill();
    ctx.strokeStyle=front&&settled?`#1fff6e`:`rgba(31,255,110,${0.2+br*0.5})`;ctx.lineWidth=front&&settled?1.5:.7;ctx.stroke();
    if(front&&value!==null){const pips=PIPS[fd.val]||PIPS[1];const dx=proj[1][0]-proj[0][0],dy=proj[1][1]-proj[0][1];const fw=Math.sqrt(dx*dx+dy*dy)*.38;const cx2=proj.reduce((s,p)=>s+p[0],0)/4,cy2=proj.reduce((s,p)=>s+p[1],0)/4;ctx.fillStyle="#1fff6e";ctx.shadowColor="#1fff6e";ctx.shadowBlur=7;pips.forEach(([px,py])=>{ctx.beginPath();ctx.arc(cx2+px*fw,cy2+py*fw,Math.max(2.5,fw*.17),0,Math.PI*2);ctx.fill();});ctx.shadowBlur=0;}
  });
}

// ── Single die canvas ─────────────────────────────────────────────────────────
function CanvasDie({ sides, value, rolling, size = 76 }) {
  const ref = useRef(null);
  const rafRef = useRef(null);
  const st = useRef({ rx: Math.random()*6, ry: Math.random()*6, rz: Math.random()*6, vx:0, vy:0, vz:0 });

  const draw = useCallback(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = st.current;
    if (sides === 6) renderD6(ctx, size, s.rx, s.ry, s.rz, value, !rolling);
    else renderPoly(ctx, size, s.rx, s.ry, s.rz, sides, value, !rolling);
  }, [sides, value, rolling, size]);

  useEffect(() => {
    const s = st.current;
    cancelAnimationFrame(rafRef.current);
    if (rolling) {
      s.vx = (Math.random()-.5)*.3; s.vy = (Math.random()-.5)*.3; s.vz = (Math.random()-.5)*.15;
      const tick = () => {
        s.vx+=(Math.random()-.5)*.05; s.vy+=(Math.random()-.5)*.05;
        s.rx+=s.vx; s.ry+=s.vy; s.rz+=s.vz;
        draw(); rafRef.current=requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      let t=0; const fromRx=s.rx,fromRy=s.ry,fromRz=s.rz,toRx=.4,toRy=.6,toRz=.2;
      const ease = () => {
        t+=.07; if(t>=1){s.rx=toRx;s.ry=toRy;s.rz=toRz;draw();return;}
        const e=1-(1-t)*(1-t);
        s.rx=fromRx+(toRx-fromRx)*e; s.ry=fromRy+(toRy-fromRy)*e; s.rz=fromRz+(toRz-fromRz)*e;
        draw(); rafRef.current=requestAnimationFrame(ease);
      };
      rafRef.current = requestAnimationFrame(ease);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [rolling, draw]);

  useEffect(() => { draw(); }, [draw]);

  return <canvas ref={ref} width={size} height={size} className="die-canvas" />;
}

// ── Die button ────────────────────────────────────────────────────────────────
function DieButton({ sides, label, onClick }) {
  return (
    <button className="die-btn" onClick={() => onClick(sides, label)}>
      <CanvasDie sides={sides} value={null} rolling={false} size={64} />
      <span className="die-btn-label">{label}</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
let nextId = 0;

export default function DiceRoller() {
  const [rolls, setRolls] = useState([]); // { id, sides, label, value, rolling }

  function addDie(sides, label) {
    const id = nextId++;
    const value = Math.ceil(Math.random() * sides);
    setRolls(r => [...r, { id, sides, label, value, rolling: true }]);
    setTimeout(() => {
      setRolls(r => r.map(d => d.id === id ? { ...d, rolling: false } : d));
    }, 900);
  }

  function clear() { setRolls([]); }

  const total = rolls.filter(r => !r.rolling).reduce((s, r) => s + r.value, 0);
  const anySettled = rolls.some(r => !r.rolling);

  return (
    <div className="dice-roller">
      <div className="section-header">
        <h2>Dice Roller</h2>
        {rolls.length > 0 && (
          <button className="btn btn-ghost" onClick={clear}>Clear</button>
        )}
      </div>

      <div className="die-btn-row">
        {DICE.map(d => (
          <DieButton key={d.sides} sides={d.sides} label={d.label} onClick={addDie} />
        ))}
      </div>

      {rolls.length > 0 && (
        <div className="results-panel">
          <div className="results-dice">
            {rolls.map(r => (
              <div key={r.id} className="result-item">
                <CanvasDie sides={r.sides} value={r.value} rolling={r.rolling} size={80} />
                <span className="result-label">{r.label}{!r.rolling && ` · ${r.value}`}</span>
              </div>
            ))}
          </div>
          {anySettled && (
            <div className="results-total">
              Total: <span>{total}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
