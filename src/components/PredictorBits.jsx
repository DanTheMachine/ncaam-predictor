import { TEAMS } from "../data/ncaaData";

export function CourtBar({ hProb, hColor, aColor }) {
  return (
    <div style={{ position:"relative", height:56, borderRadius:6, overflow:"hidden", border:"1px solid rgba(180,120,20,0.15)" }}>
      <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:2, background:"rgba(255,200,50,0.15)", zIndex:3 }} />
      <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:38, height:38, borderRadius:"50%", border:"2px solid rgba(255,200,50,0.15)", zIndex:3 }} />
      <div style={{ width:`${hProb*100}%`, background:`linear-gradient(90deg,${hColor}ee,${hColor}88)`, height:"100%", display:"flex", alignItems:"center", paddingLeft:16, transition:"width 1.2s cubic-bezier(.4,0,.2,1)", position:"relative", zIndex:1 }}>
        <span style={{ fontSize:18, fontWeight:900, color:"#fff", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, textShadow:"0 2px 10px rgba(0,0,0,0.9)" }}>{(hProb*100).toFixed(1)}%</span>
      </div>
      <div style={{ position:"absolute", right:0, top:0, width:`${(1-hProb)*100}%`, background:`linear-gradient(90deg,${aColor}88,${aColor}ee)`, height:"100%", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:16, transition:"width 1.2s cubic-bezier(.4,0,.2,1)", zIndex:1 }}>
        <span style={{ fontSize:18, fontWeight:900, color:"#fff", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, textShadow:"0 2px 10px rgba(0,0,0,0.9)" }}>{((1-hProb)*100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function StatBar({ label, hVal, aVal, hColor, aColor, lo, hi, invert=false, fmt="num" }) {
  const norm = v => Math.max(0, Math.min(100, ((v-lo)/(hi-lo))*100));
  const disp = v => fmt==="pct" ? `${v.toFixed(1)}%` : v.toFixed(1);
  const mid  = (lo+hi)/2;
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ fontSize:9, color:"#c8a060", letterSpacing:2.5, marginBottom:4, fontFamily:"'Courier New',monospace", textTransform:"uppercase" }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:12, fontWeight:700, color:(invert?hVal<=mid:hVal>=mid)?"#f5c518":"#4b5563", width:50, textAlign:"right", fontFamily:"'Courier New',monospace" }}>{disp(hVal)}</span>
        <div style={{ flex:1, height:5, background:"rgba(255,200,50,0.08)", borderRadius:3, position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${norm(hVal)}%`, background:hColor, opacity:0.85, borderRadius:3, transition:"width 1s ease" }} />
        </div>
        <div style={{ flex:1, height:5, background:"rgba(255,200,50,0.08)", borderRadius:3, position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${norm(aVal)}%`, background:aColor, opacity:0.85, borderRadius:3, transition:"width 1s ease" }} />
        </div>
        <span style={{ fontSize:12, fontWeight:700, color:(invert?aVal<=mid:aVal>=mid)?"#f5c518":"#4b5563", width:50, fontFamily:"'Courier New',monospace" }}>{disp(aVal)}</span>
      </div>
    </div>
  );
}

export function TeamCard({ abbr, side, liveStats }) {
  const base  = TEAMS[abbr];
  const live  = liveStats?.[abbr];
  const s     = live ? { ...base, ...live } : base;
  return (
    <div style={{ background:`linear-gradient(135deg,${base.color}20,transparent)`, border:`1px solid ${base.color}35`, borderRadius:8, padding:"13px 16px" }}>
      <div style={{ fontSize:9, color:base.color, letterSpacing:3, fontFamily:"'Courier New',monospace", marginBottom:2 }}>{side} · {base.conf}</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#f0e8d0", letterSpacing:3, marginBottom:11, display:"flex", alignItems:"center", gap:8 }}>
        {base.name.toUpperCase()}
        {live && <span style={{ fontSize:9, color:"#4ade80", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)", borderRadius:3, padding:"1px 5px", fontFamily:"monospace" }}>KP</span>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
        {[["ADJ O",s.adjO.toFixed(1)],["ADJ D",s.adjD.toFixed(1)],["ADJ EM",`${s.adjEM>=0?"+":""}${s.adjEM.toFixed(1)}`],
          ["TEMPO",s.tempo.toFixed(1)],["eFG%",`${s.efgPct.toFixed(1)}%`],["TOV%",`${s.tovPct.toFixed(1)}%`],
          ["ORB%",`${s.orbPct.toFixed(1)}%`],["FTR",`${s.ftr.toFixed(1)}%`]
        ].map(([l,v]) => (
          <div key={l}>
            <div style={{ fontSize:8, color:"#7a6030", letterSpacing:1 }}>{l}</div>
            <div style={{ fontSize:12, fontWeight:700, color:"#f0e8d0", fontFamily:"'Courier New',monospace" }}>{v}</div>
          </div>
        ))}
      </div>
      {live && <div style={{ marginTop:7, fontSize:9, color:"#5a9a6a", fontFamily:"monospace" }}>Updated: {live.lastUpdated}</div>}
      <div style={{ marginTop:live?4:8 }}>
        <span style={{ fontSize:9, padding:"2px 7px", borderRadius:2, background:"rgba(255,200,50,0.06)", color:"#7a6030" }}>{base.arena} · {base.capacity.toLocaleString()}</span>
      </div>
    </div>
  );
}

