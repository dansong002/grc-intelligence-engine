import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LIBRARY_VERSION,
  RATING_VALUE,
  VALUE_RATING,
  CONTROL_REDUCTION,
  POINTS_PER_LEVEL,
  computeResidual,
  ARCHETYPES,
  RISKS,
  CONTROLS,
  SAMPLES,
  CONTROL_PROCEDURES,
  DOC_TIERS,
  CONTROL_DOCUMENTS,
} from "./knowledge";

/* ============================================================================
 * GRC INTELLIGENCE ENGINE — prototype (v0.2.0)
 * ==========================================================================*/

const C = {
  canvas: "#0E1419", panel: "#161E26", panelHi: "#1D2832", line: "#26333F",
  ink: "#E8EEF2", inkDim: "#93A4B1", inkFaint: "#5E6F7C",
  amber: "#F5A623", amberSoft: "#3A2E18", red: "#E5544B", redSoft: "#3A1E1C",
  teal: "#46B3A4", tealSoft: "#16302D", violet: "#8B7FD6",
};
const RATING_COLOR = { Critical: C.red, High: C.amber, Medium: C.teal, Low: C.inkDim };
const TYPE_COLOR = { Preventive: C.teal, Detective: C.violet, Corrective: C.amber };

function classify(text) {
  const t = (text || "").toLowerCase();
  return ARCHETYPES.map((a) => {
    let score = 0;
    const matched = [];
    a.signals.forEach((s) => {
      const re = new RegExp("(?:^|\\b|\\s)" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:$|\\b|\\s)");
      if (re.test(t)) { score += 1; matched.push(s); }
    });
    return { archetype: a, score, matched };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

function buildAssessment(text) {
  const matches = classify(text);
  if (matches.length === 0) return null;
  const active = matches.slice(0, 2);
  const riskIds = [];
  active.forEach((m) => m.archetype.risks.forEach((r) => { if (!riskIds.includes(r)) riskIds.push(r); }));

  const risks = riskIds.map((id) => RISKS[id]).filter(Boolean).map((r) => {
    const mapped = r.controls.map((cid) => CONTROLS[cid]).filter(Boolean);
    return { ...r, residual: computeResidual(r.inherent, mapped) };
  });

  const controlMap = {};
  risks.forEach((r) => r.controls.forEach((cid) => {
    if (!controlMap[cid]) controlMap[cid] = { control: CONTROLS[cid], addresses: [], procedures: CONTROL_PROCEDURES[cid] || null };
    if (CONTROLS[cid]) controlMap[cid].addresses.push(r.id);
  }));
  const controls = Object.values(controlMap).filter((c) => c.control);

  const fw = new Set();
  risks.forEach((r) => r.frameworks.forEach((f) => fw.add(f.split(":")[0].trim())));

  const dist = (key) => {
    const d = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    risks.forEach((r) => { d[key === "inherent" ? r.inherent : r.residual.residual] += 1; });
    return d;
  };
  const inherentDist = dist("inherent");
  const residualDist = dist("residual");

  const docMap = {};
  controls.forEach((c) => (CONTROL_DOCUMENTS[c.control.id] || []).forEach((d) => {
    const key = d.tier + "|" + d.name;
    if (!docMap[key]) docMap[key] = { tier: d.tier, name: d.name, purpose: d.purpose, controls: [] };
    if (!docMap[key].controls.includes(c.control.id)) docMap[key].controls.push(c.control.id);
  }));
  const docsByTier = DOC_TIERS.map((t) => ({
    ...t,
    docs: Object.values(docMap).filter((d) => d.tier === t.id).sort((a, b) => a.name.localeCompare(b.name)),
  }));
  const docCount = Object.keys(docMap).length;

  return {
    archetypes: active.map((a) => ({ ...a.archetype, matched: a.matched })),
    risks, controls, docsByTier, docCount, frameworks: Array.from(fw).sort(),
    inherentDist, residualDist,
    inherentHC: inherentDist.Critical + inherentDist.High,
    residualHC: residualDist.Critical + residualDist.High,
  };
}

function Mono({ children, style }) {
  return <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", ...style }}>{children}</span>;
}
function Pill({ children, color, soft }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500,
      letterSpacing: "0.03em", color, background: soft, padding: "3px 9px",
      borderRadius: 4, border: `1px solid ${color}33`, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
function Dot({ color }) {
  return <span style={{ width: 7, height: 7, borderRadius: 99, background: color, flexShrink: 0 }} />;
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", color: C.inkFaint, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      <div style={{ color: C.inkDim, fontSize: 13.5, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function SourceDrawer({ item, kind, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!item) return;
    const prev = typeof document !== "undefined" ? document.activeElement : null;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    if (closeRef.current) closeRef.current.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, [item, onClose]);
  if (!item) return null;
  const reductionLine = item.residual
    ? item.residual.breakdown.Preventive + "P / " + item.residual.breakdown.Detective + "D / " + item.residual.breakdown.Corrective + "C = " + item.residual.points + " pts " + (item.residual.levels === 0 ? "(no level change)" : "(down " + item.residual.levels + " level" + (item.residual.levels > 1 ? "s" : "") + ")")
    : "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end", background: "rgba(6,10,13,0.6)", backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", height: "100%", background: C.panel, borderLeft: `1px solid ${C.line}`, padding: "28px 26px", overflowY: "auto", boxShadow: "-20px 0 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <Pill color={C.inkFaint} soft="transparent">LIBRARY SOURCE · {kind}</Pill>
          <button ref={closeRef} onClick={onClose} aria-label="Close panel" style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.inkDim, borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        <Mono style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>{item.id}</Mono>
        <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 600, margin: "8px 0 16px", lineHeight: 1.35 }}>{item.title}</h3>

        {kind === "RISK" && (
          <>
            <Field label="Domain · Class">{item.domain} · {item.class}</Field>
            <Field label="Risk statement"><span style={{ color: C.ink }}>{item.statement}</span></Field>
            <Field label="Inherent rating">
              <Pill color={RATING_COLOR[item.inherent]} soft={`${RATING_COLOR[item.inherent]}1A`}><Dot color={RATING_COLOR[item.inherent]} /> {item.inherent}</Pill>
            </Field>
            {item.residual && (
              <Field label="Target residual (with controls in place)">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Pill color={RATING_COLOR[item.inherent]} soft={`${RATING_COLOR[item.inherent]}1A`}>{item.inherent}</Pill>
                  <span style={{ color: C.inkFaint }}>{"→"}</span>
                  <Pill color={RATING_COLOR[item.residual.residual]} soft={`${RATING_COLOR[item.residual.residual]}1A`}><Dot color={RATING_COLOR[item.residual.residual]} />{item.residual.residual}</Pill>
                </div>
                <Mono style={{ fontSize: 12, color: C.inkFaint, lineHeight: 1.55 }}>{reductionLine}</Mono>
                <div style={{ fontSize: 11.5, color: C.inkFaint, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>Target residual assumes the mapped controls are implemented and operating. It is not current-state.</div>
              </Field>
            )}
            <Field label="Mitigating controls">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {item.controls.map((c) => <Mono key={c} style={{ fontSize: 11, color: C.teal, border: `1px solid ${C.teal}33`, padding: "2px 7px", borderRadius: 4 }}>{c}</Mono>)}
              </div>
            </Field>
            <Field label="Frameworks implicated">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {item.frameworks.map((f) => <span key={f} style={{ color: C.violet, fontSize: 13 }}>{f}</span>)}
              </div>
            </Field>
          </>
        )}

        {kind === "CONTROL" && (
          <>
            <Field label="Control type"><Pill color={TYPE_COLOR[item.type]} soft={`${TYPE_COLOR[item.type]}1A`}>{item.type}</Pill></Field>
            <Field label="Control statement"><span style={{ color: C.ink }}>{item.statement}</span></Field>
            <Field label="Suggested owner">{item.owner}</Field>
            <Field label="Frequency">{item.frequency}</Field>
            <Field label="Evidence an auditor expects"><span style={{ color: C.ink }}>{item.evidence}</span></Field>
            {item.procedures && item.procedures.implementation && (
              <Field label="Implementation steps">
                <ol style={{ margin: 0, paddingLeft: 18, color: C.ink }}>
                  {item.procedures.implementation.map((s, i) => <li key={i} style={{ marginBottom: 5, lineHeight: 1.5 }}>{s}</li>)}
                </ol>
              </Field>
            )}
            {item.procedures && item.procedures.testing && (
              <Field label="Audit test procedure"><span style={{ color: C.ink }}>{item.procedures.testing}</span></Field>
            )}
          </>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.inkFaint, lineHeight: 1.6 }}>This entry comes from the curated knowledge library (v{LIBRARY_VERSION}), not generated on the fly.</div>
      </div>
    </div>
  );
}

function StatCard({ n, label, color }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "16px 16px" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 600, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: C.inkDim, marginTop: 7 }}>{label}</div>
    </div>
  );
}
function SectionLabel({ n, title, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <Mono style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>{n}</Mono>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 4, marginLeft: 22 }}>{hint}</div>
    </div>
  );
}
function Card({ children, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "14px 15px", cursor: "pointer", transition: "all .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.panelHi; e.currentTarget.style.borderColor = C.inkFaint + "66"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; e.currentTarget.style.borderColor = C.line; }}>
      {children}
    </div>
  );
}
function Why({ title, body }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 18px" }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, marginBottom: 8, lineHeight: 1.35 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

/* ---- library browser ---- */
function Segmented({ tabs, active, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: 3, gap: 3, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          background: active === t.id ? C.panelHi : "transparent",
          color: active === t.id ? C.ink : C.inkDim,
          border: active === t.id ? `1px solid ${C.line}` : "1px solid transparent",
          borderRadius: 7, padding: "6px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function ChipLink({ label, onClick, color }) {
  const c = color || C.teal;
  return (
    <span onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = c + "22"; e.currentTarget.style.borderColor = c + "88"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = c + "33"; }}
      style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: c, border: `1px solid ${c}33`, padding: "2px 7px", borderRadius: 4, cursor: "pointer", background: "transparent", transition: "background .12s, border-color .12s" }}>{label}</span>
  );
}

function EmptyNote({ text }) {
  return (
    <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 11, padding: "26px 18px", textAlign: "center", color: C.inkFaint, fontSize: 13.5, lineHeight: 1.5 }}>{text}</div>
  );
}

function LibraryBrowser({ onOpen }) {
  const [tab, setTab] = useState("risks");
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();

  const allRisks = Object.values(RISKS);
  const allControls = Object.values(CONTROLS);

  const fwMap = {};
  allRisks.forEach((r) => r.frameworks.forEach((f) => {
    const name = f.split(":")[0].trim();
    if (!fwMap[name]) fwMap[name] = [];
    if (!fwMap[name].includes(r.id)) fwMap[name].push(r.id);
  }));
  const frameworks = Object.keys(fwMap).map((name) => ({ name, ids: fwMap[name] })).sort((a, b) => b.ids.length - a.ids.length);

  const risks = allRisks.filter((r) => !ql || (r.id + " " + r.title + " " + r.domain + " " + r.class).toLowerCase().includes(ql));
  const controls = allControls.filter((c) => !ql || (c.id + " " + c.title + " " + c.type + " " + c.owner).toLowerCase().includes(ql));
  const arches = ARCHETYPES.filter((a) => !ql || (a.label + " " + a.hint).toLowerCase().includes(ql));
  const fws = frameworks.filter((f) => !ql || f.name.toLowerCase().includes(ql));

  const tabs = [
    { id: "risks", label: "Risks (" + allRisks.length + ")" },
    { id: "controls", label: "Controls (" + allControls.length + ")" },
    { id: "archetypes", label: "Archetypes (" + ARCHETYPES.length + ")" },
    { id: "frameworks", label: "Frameworks (" + frameworks.length + ")" },
  ];
  const showFilter = tab === "risks" || tab === "controls";

  return (
    <section style={{ paddingTop: 40, paddingBottom: 20 }}>
      <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.amber }}>THE CURATED LIBRARY</Mono>
      <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "14px 0 12px", maxWidth: 720 }}>The asset, as data.</h1>
      <p style={{ color: C.inkDim, fontSize: 15.5, lineHeight: 1.55, maxWidth: 640, margin: "0 0 22px" }}>
        Every risk and control the engine draws on, with its framework mapping, owner, and the evidence an auditor expects. This curated graph — not the model — is what makes the output consistent and defensible. Click any entry to inspect its source.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Segmented tabs={tabs} active={tab} onChange={(id) => { setTab(id); setQ(""); }} />
        {showFilter && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 12px", color: C.ink, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none", minWidth: 180 }} />
        )}
      </div>

      {tab === "risks" && (risks.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="grid2">
          {risks.map((r) => (
            <Card key={r.id} onClick={() => onOpen({ item: r, kind: "RISK" })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <Mono style={{ fontSize: 11, color: C.inkFaint }}>{r.id}</Mono>
                <Pill color={RATING_COLOR[r.inherent]} soft={`${RATING_COLOR[r.inherent]}1A`}><Dot color={RATING_COLOR[r.inherent]} />{r.inherent}</Pill>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{r.title}</div>
              <Mono style={{ fontSize: 10.5, color: C.inkFaint }}>{r.domain + " · " + r.class + " · " + r.controls.length + " controls"}</Mono>
            </Card>
          ))}
        </div>
      ) : <EmptyNote text={"No risks match “" + q + "” — try a different term."} />)}

      {tab === "controls" && (controls.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="grid2">
          {controls.map((c) => (
            <Card key={c.id} onClick={() => onOpen({ item: { ...c, procedures: CONTROL_PROCEDURES[c.id] || null }, kind: "CONTROL" })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <Mono style={{ fontSize: 11, color: C.inkFaint }}>{c.id}</Mono>
                <Pill color={TYPE_COLOR[c.type]} soft={`${TYPE_COLOR[c.type]}1A`}>{c.type}</Pill>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{c.title}</div>
              <Mono style={{ fontSize: 10.5, color: C.inkFaint }}>{c.owner}</Mono>
            </Card>
          ))}
        </div>
      ) : <EmptyNote text={"No controls match “" + q + "” — try a different term."} />)}

      {tab === "archetypes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {arches.map((a) => (
            <div key={a.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <Pill color={C.amber} soft={`${C.amber}1A`}>{a.label}</Pill>
                <Mono style={{ fontSize: 10.5, color: C.inkFaint }}>{a.risks.length + " risks"}</Mono>
              </div>
              <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.5, marginBottom: 10 }}>{a.hint}</div>
              <Mono style={{ fontSize: 10, color: C.inkFaint, display: "block" }}>SIGNALS</Mono>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "6px 0 10px" }}>
                {a.signals.slice(0, 14).map((s, i) => <Mono key={i} style={{ fontSize: 10.5, color: C.inkDim, background: C.panelHi, padding: "2px 7px", borderRadius: 4 }}>{s.trim()}</Mono>)}
              </div>
              <Mono style={{ fontSize: 10, color: C.inkFaint }}>TRIGGERS</Mono>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                {a.risks.filter((rid) => RISKS[rid]).map((rid) => <ChipLink key={rid} label={rid} onClick={() => onOpen({ item: RISKS[rid], kind: "RISK" })} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "frameworks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fws.map((f) => (
            <div key={f.name} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.violet }}>{f.name}</span>
                <Mono style={{ fontSize: 10.5, color: C.inkFaint }}>{f.ids.length + " risks mapped"}</Mono>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {f.ids.filter((rid) => RISKS[rid]).map((rid) => <ChipLink key={rid} label={rid} onClick={() => onOpen({ item: RISKS[rid], kind: "RISK" })} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---- main app ---- */
export default function App() {
  const [input, setInput] = useState("");
  const [view, setView] = useState("engine");
  const [submitted, setSubmitted] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [aiNotes, setAiNotes] = useState(null);
  const [aiState, setAiState] = useState("idle");
  const [exported, setExported] = useState(false);
  const resultRef = useRef(null);

  const assessment = useMemo(() => submitted ? buildAssessment(submitted) : null, [submitted]);

  const run = (text) => {
    const t = text === undefined ? input : text;
    if (!t.trim()) return;
    setSubmitted(t);
    setAiNotes(null);
    setAiState("idle");
  };

  useEffect(() => {
    if (assessment && resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [assessment]);

  const deepenWithAI = async () => {
    if (!assessment) return;
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setAiState("no-key");
      return;
    }
    setAiState("loading");
    const riskList = assessment.risks.map((r) => r.id + ": " + r.title).join("\n");
    const prompt = "You are a senior GRC architect reviewing a draft assessment. The initiative is:\n\n\"" + submitted + "\"\n\nA baseline assessment from our curated control library already identified these risks:\n" + riskList + "\n\nYour job is NOT to repeat them. Identify up to 3 initiative-SPECIFIC considerations the generic baseline would miss. For each, give a one-sentence watch and a one-sentence why. Return ONLY a JSON array, no markdown:\n[{\"watch\":\"...\",\"why\":\"...\"}]";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAiNotes(parsed);
      setAiState("done");
    } catch (e) {
      setAiState("error");
    }
  };

  const downloadSummary = () => {
    if (!assessment) return;
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const rc = { Critical: "#C0392B", High: "#D68910", Medium: "#1F8A70", Low: "#566573" };

    let riskRows = "";
    assessment.risks.forEach((r) => {
      riskRows += "<tr><td class='mono'>" + esc(r.id) + "</td><td><strong>" + esc(r.title) + "</strong><br><span class='dim'>" + esc(r.statement) + "</span></td><td><span class='tag' style='color:" + rc[r.inherent] + ";border-color:" + rc[r.inherent] + "'>" + r.inherent + "</span></td><td><span class='tag' style='color:" + rc[r.residual.residual] + ";border-color:" + rc[r.residual.residual] + "'>" + r.residual.residual + "</span></td></tr>";
    });

    let controlRows = "";
    assessment.controls.forEach((c) => {
      controlRows += "<tr><td class='mono'>" + esc(c.control.id) + "</td><td><strong>" + esc(c.control.title) + "</strong> <span class='pill'>" + c.control.type + "</span><br><span class='dim'>" + esc(c.control.statement) + "</span></td><td>" + esc(c.control.owner) + "</td><td class='mono dim'>" + c.addresses.map(esc).join(", ") + "</td></tr>";
    });

    let checklist = "";
    assessment.controls.forEach((c) => {
      if (c.procedures && c.procedures.implementation) {
        let steps = "";
        c.procedures.implementation.forEach((s) => { steps += "<li>" + esc(s) + "</li>"; });
        checklist += "<div class='block'><div class='mono accent'>" + esc(c.control.id) + " - " + esc(c.control.title) + "</div><ol>" + steps + "</ol></div>";
      }
    });

    let testRows = "";
    assessment.controls.forEach((c) => {
      if (c.procedures && c.procedures.testing) {
        testRows += "<tr><td class='mono'>" + esc(c.control.id) + "</td><td>" + esc(c.procedures.testing) + "</td><td class='dim'>" + esc(c.control.evidence) + "</td></tr>";
      }
    });

    let aiBlock = "";
    if (aiState === "done" && aiNotes && aiNotes.length) {
      let notes = "";
      aiNotes.forEach((n) => { notes += "<div class='block'><strong>" + esc(n.watch) + "</strong><br><span class='dim'>" + esc(n.why) + "</span></div>"; });
      aiBlock = "<h2>Initiative-Specific Considerations</h2><p class='dim small'>AI-generated; review before relying.</p>" + notes;
    }

    let docsBlock = "";
    const populatedTiers = assessment.docsByTier.filter((t) => t.docs.length > 0);
    if (populatedTiers.length) {
      let inner = "";
      populatedTiers.forEach((t) => {
        let rows = "";
        t.docs.forEach((d) => {
          rows += "<tr><td><strong>" + esc(d.name) + "</strong><br><span class='dim'>" + esc(d.purpose) + "</span></td><td class='mono dim'>" + d.controls.map(esc).join(", ") + "</td></tr>";
        });
        inner += "<h3 style='font-size:13px;margin:18px 0 6px;color:#1a2530'>" + esc(t.label) + " <span class='dim small' style='font-weight:normal'>" + esc(t.blurb) + "</span></h3>";
        inner += "<table><thead><tr><th>Document</th><th>Backs</th></tr></thead><tbody>" + rows + "</tbody></table>";
      });
      docsBlock = "<h2>Recommended Governance Documents</h2><p class='dim small'>Recommended document set, not authored content. The writing remains the practitioner's, in the organization's own voice and approval path.</p>" + inner;
    }

    const css = "@media print{@page{margin:18mm}}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a2530;max-width:880px;margin:0 auto;padding:32px 28px;line-height:1.5}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px;border-bottom:2px solid #1a2530;padding-bottom:5px}.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}.dim{color:#5a6b78}.small{font-size:12px}.accent{color:#B5790F;font-weight:600}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}th{text-align:left;background:#f1f4f6;padding:7px 9px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#4a5a66;border-bottom:2px solid #d5dde2}td{padding:8px 9px;border-bottom:1px solid #e3e9ed;vertical-align:top}.tag{display:inline-block;font-family:ui-monospace,monospace;font-size:11px;font-weight:600;padding:2px 8px;border:1px solid;border-radius:4px}.pill{display:inline-block;font-size:10px;padding:1px 6px;background:#eef2f4;border-radius:3px;color:#566573}.block{margin:8px 0;padding:10px 12px;background:#f7f9fa;border-left:3px solid #B5790F;border-radius:4px}.block ol{margin:6px 0 0;padding-left:20px}.block li{margin-bottom:3px}.meta{display:flex;gap:24px;flex-wrap:wrap;margin:14px 0 6px;font-size:13px}.meta b{font-size:20px;font-family:ui-monospace,monospace}.banner{background:#fdf6e9;border:1px solid #e8cf9a;border-radius:6px;padding:12px 14px;font-size:12.5px;color:#6b5320;margin-top:26px}.head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;border-bottom:3px solid #1a2530;padding-bottom:12px}";

    const archetypeLabels = assessment.archetypes.map((a) => esc(a.label)).join(", ");
    const frameworkList = assessment.frameworks.map(esc).join(" - ");

    const html = "<!doctype html><html><head><meta charset='utf-8'><title>GRC Assessment Summary</title><style>" + css + "</style></head><body>" +
      "<div class='head'><div><h1>Governance Assessment</h1><div class='dim small'>Executive Summary - Generated " + esc(date) + "</div></div><div class='mono dim'>Knowledge Library v" + esc(LIBRARY_VERSION) + "</div></div>" +
      "<h2>Initiative</h2><p>" + esc(submitted) + "</p><p class='small dim'>Classified as: " + archetypeLabels + "</p>" +
      "<div class='meta'><div><b>" + assessment.risks.length + "</b><br><span class='dim small'>Risks</span></div><div><b>" + assessment.controls.length + "</b><br><span class='dim small'>Controls</span></div><div><b>" + assessment.inherentHC + "</b><br><span class='dim small'>High/Critical inherent</span></div><div><b>" + assessment.residualHC + "</b><br><span class='dim small'>High/Critical residual*</span></div></div>" +
      "<h2>Risk Register</h2><table><thead><tr><th>ID</th><th>Risk</th><th>Inherent</th><th>Residual*</th></tr></thead><tbody>" + riskRows + "</tbody></table>" +
      "<h2>Control Matrix</h2><table><thead><tr><th>ID</th><th>Control</th><th>Owner</th><th>Addresses</th></tr></thead><tbody>" + controlRows + "</tbody></table>" +
      "<h2>Implementation Checklist</h2>" + checklist +
      "<h2>Audit Testing Procedures</h2><table><thead><tr><th>Control</th><th>Test Procedure</th><th>Evidence</th></tr></thead><tbody>" + testRows + "</tbody></table>" +
      "<h2>Frameworks Implicated</h2><p>" + frameworkList + "</p>" + docsBlock + aiBlock +
      "<div class='banner'><strong>* Target residual.</strong> Residual assumes recommended controls are implemented and operating effectively - not current-state. This is a decision-support draft, not a professional opinion, audit opinion, QSA assessment, or legal advice. A qualified practitioner must review, tailor, and own the result.</div>" +
      "</body></html>";

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GRC-Assessment-" + new Date().toISOString().slice(0, 10) + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
    setTimeout(() => setExported(false), 2200);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif", backgroundImage: `radial-gradient(circle at 18% 0%, ${C.panel} 0%, ${C.canvas} 42%)` }}>
      <style>{`
        * { box-sizing: border-box; }
        ::selection { background: ${C.amber}; color: #1a1206; }
        textarea::placeholder { color: ${C.inkFaint}; }
        @media (max-width: 760px) { .grid2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <SourceDrawer item={drawer ? drawer.item : null} kind={drawer ? drawer.kind : null} onClose={() => setDrawer(null)} />

      <header style={{ borderBottom: `1px solid ${C.line}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: `${C.canvas}E8`, backdropFilter: "blur(10px)", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg, ${C.amber}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14, color: "#1a1206" }}>G</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>GRC Intelligence Engine</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "inline-flex", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ id: "engine", label: "Engine" }, { id: "library", label: "Library" }].map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                background: view === v.id ? C.panelHi : "transparent",
                color: view === v.id ? C.ink : C.inkDim,
                border: view === v.id ? `1px solid ${C.line}` : "1px solid transparent",
                borderRadius: 6, padding: "5px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>{v.label}</button>
            ))}
          </div>
          <Pill color={C.inkFaint} soft="transparent">v{LIBRARY_VERSION}</Pill>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 100px" }}>
        {view === "engine" ? (
        <>
        <section style={{ paddingTop: 56, paddingBottom: 20 }}>
          <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.amber }}>INITIATIVE TO GOVERNANCE PACKAGE</Mono>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.025em", margin: "16px 0 14px", maxWidth: 760 }}>
            Describe what you're building. Get the risk, control, and evidence package a senior GRC architect would draft.
          </h1>
          <p style={{ color: C.inkDim, fontSize: 16, lineHeight: 1.55, maxWidth: 620, margin: 0 }}>
            Backed by a curated control library — every risk and control traces to an inspectable source. Built to accelerate a practitioner's judgment, not replace it.
          </p>
          <div style={{ marginTop: 30, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} placeholder="e.g. We are implementing a new third-party SaaS platform that stores customer payment information and integrates with our ERP…" rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "vertical", color: C.ink, fontSize: 15.5, lineHeight: 1.55, fontFamily: "'Inter', sans-serif", minHeight: 70 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {SAMPLES.slice(0, 3).map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); run(s); }} style={{ background: C.panelHi, border: `1px solid ${C.line}`, color: C.inkDim, borderRadius: 7, padding: "6px 11px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    {s.length > 42 ? s.slice(0, 42) + "…" : s}
                  </button>
                ))}
              </div>
              <button onClick={() => run()} disabled={!input.trim()} style={{ background: input.trim() ? `linear-gradient(135deg, ${C.amber}, #E8920F)` : C.panelHi, color: input.trim() ? "#1a1206" : C.inkFaint, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: input.trim() ? "pointer" : "default", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
                Generate package →
              </button>
            </div>
          </div>
        </section>

        <div ref={resultRef}>
          {submitted && !assessment && (
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 28, marginTop: 16, textAlign: "center" }}>
              <p style={{ color: C.inkDim, margin: 0, lineHeight: 1.6 }}>The engine couldn't match this to a known system pattern yet. Try naming the system type, the data it handles, or a vendor — e.g. "payment processing," "AI chatbot," "ERP," "data warehouse."</p>
            </div>
          )}

          {assessment && (
            <section style={{ marginTop: 16 }}>
              <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}40`, borderRadius: 12, padding: "16px 18px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Mono style={{ fontSize: 11, letterSpacing: "0.08em", color: C.amber }}>CLASSIFIED AS</Mono>
                    {assessment.archetypes.map((a) => <Pill key={a.id} color={C.amber} soft={`${C.amber}1A`}>{a.label}</Pill>)}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: C.inkDim, lineHeight: 1.5 }}>
                    Matched on {assessment.archetypes.flatMap((a) => a.matched).slice(0, 6).map((m, i) => <Mono key={i} style={{ color: C.ink, marginRight: 8 }}>{m}</Mono>)}
                  </div>
                </div>
                <button onClick={downloadSummary} aria-live="polite" style={{ background: exported ? `${C.teal}1F` : C.canvas, border: `1px solid ${exported ? C.teal : C.amber}66`, color: exported ? C.teal : C.amber, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", transition: "all .15s" }}>
                  {exported ? "Downloaded ✓" : "↓ Export summary"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }} className="grid2">
                <StatCard n={assessment.risks.length} label="Risks identified" color={C.amber} />
                <StatCard n={assessment.controls.length} label="Controls recommended" color={C.teal} />
                <StatCard n={assessment.inherentHC} label="High / Critical — inherent" color={C.red} />
                <StatCard n={assessment.residualHC} label="High / Critical — residual*" color={assessment.residualHC < assessment.inherentHC ? C.teal : C.red} />
              </div>
              {assessment.residualHC < assessment.inherentHC && (
                <div style={{ marginBottom: 28, fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}>
                  <Mono style={{ color: C.teal }}>{"↓ " + (assessment.inherentHC - assessment.residualHC)}</Mono> fewer high/critical risks once the recommended controls are in place. <span style={{ color: C.inkFaint }}>*Target residual — not earned until the controls exist.</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="grid2">
                <div>
                  <SectionLabel n="01" title="Risk Register" hint="Inherent and target residual" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assessment.risks.map((r) => (
                      <Card key={r.id} onClick={() => setDrawer({ item: r, kind: "RISK" })}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <Mono style={{ fontSize: 11, color: C.inkFaint }}>{r.id}</Mono>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Pill color={RATING_COLOR[r.inherent]} soft={`${RATING_COLOR[r.inherent]}1A`}>{r.inherent}</Pill>
                            <span style={{ color: C.inkFaint, fontSize: 12 }}>{"→"}</span>
                            <Pill color={RATING_COLOR[r.residual.residual]} soft={`${RATING_COLOR[r.residual.residual]}1A`}><Dot color={RATING_COLOR[r.residual.residual]} />{r.residual.residual}</Pill>
                          </div>
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{r.title}</div>
                        <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}>{r.statement}</div>
                        <Mono style={{ marginTop: 9, fontSize: 10.5, color: C.inkFaint, display: "block" }}>{r.domain + " · " + r.controls.length + " controls · " + (r.residual.levels > 0 ? "down " + r.residual.levels : "no reduction") + " · inspect"}</Mono>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel n="02" title="Control Matrix" hint="Mapped to the risks they address" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assessment.controls.map((c) => (
                      <Card key={c.control.id} onClick={() => setDrawer({ item: { ...c.control, procedures: c.procedures }, kind: "CONTROL" })}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <Mono style={{ fontSize: 11, color: C.inkFaint }}>{c.control.id}</Mono>
                          <Pill color={TYPE_COLOR[c.control.type]} soft={`${TYPE_COLOR[c.control.type]}1A`}>{c.control.type}</Pill>
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{c.control.title}</div>
                        <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}>{c.control.statement}</div>
                        <div style={{ marginTop: 9, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          <Mono style={{ fontSize: 10, color: C.inkFaint }}>ADDRESSES</Mono>
                          {c.addresses.map((a) => <Mono key={a} style={{ fontSize: 10, color: C.teal }}>{a}</Mono>)}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <SectionLabel n="03" title="Implementation Checklist" hint="Steps to stand up each recommended control" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {assessment.controls.filter((c) => c.procedures && c.procedures.implementation).map((c) => (
                    <div key={c.control.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9, flexWrap: "wrap" }}>
                        <Mono style={{ fontSize: 11, color: C.teal }}>{c.control.id}</Mono>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{c.control.title}</span>
                        <Pill color={TYPE_COLOR[c.control.type]} soft={`${TYPE_COLOR[c.control.type]}1A`}>{c.control.type}</Pill>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {c.procedures.implementation.map((step, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${C.inkFaint}`, flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.45 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 10, display: "block" }}>Checkboxes are visual — this preview doesn't persist state. The exported summary captures the full checklist.</Mono>
              </div>

              <div style={{ marginTop: 28 }}>
                <SectionLabel n="04" title="Audit Testing Procedures" hint="How each control would be tested for evidence" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {assessment.controls.filter((c) => c.procedures && c.procedures.testing).map((c) => (
                    <div key={c.control.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 15px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 5, flexWrap: "wrap" }}>
                        <Mono style={{ fontSize: 11, color: C.violet }}>{c.control.id}</Mono>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c.control.title}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.5 }}>{c.procedures.testing}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <SectionLabel n="05" title="Frameworks Implicated" hint="Where this initiative creates obligations" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {assessment.frameworks.map((f) => <span key={f} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: C.violet, background: `${C.violet}14`, border: `1px solid ${C.violet}33`, padding: "7px 13px", borderRadius: 7 }}>{f}</span>)}
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <SectionLabel n="06" title="Recommended Governance Documents" hint={"Policy, standard, and procedure scaffolding the controls live under · " + assessment.docCount + " documents across " + assessment.docsByTier.filter((t) => t.docs.length).length + " tier" + (assessment.docsByTier.filter((t) => t.docs.length).length === 1 ? "" : "s")} />
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {assessment.docsByTier.filter((t) => t.docs.length > 0).map((t) => (
                    <div key={t.id}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 9, flexWrap: "wrap" }}>
                        <Mono style={{ fontSize: 11, color: C.amber, fontWeight: 600, letterSpacing: "0.05em" }}>{t.label.toUpperCase()}</Mono>
                        <span style={{ fontSize: 12, color: C.inkFaint, fontStyle: "italic" }}>{t.blurb}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="grid2">
                        {t.docs.map((d) => (
                          <div key={d.name} style={{ background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.amber}`, borderRadius: 10, padding: "13px 15px" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.35, marginBottom: 6 }}>{d.name}</div>
                            <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5, marginBottom: 9 }}>{d.purpose}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                              <Mono style={{ fontSize: 10, color: C.inkFaint }}>BACKS</Mono>
                              {d.controls.map((cid) => <Mono key={cid} style={{ fontSize: 10, color: C.teal }}>{cid}</Mono>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 12, display: "block", lineHeight: 1.55 }}>
                  Recommended document set, not authored content. Each document is the scaffolding required to govern the controls listed — the writing remains the practitioner's, with the organization's own voice, governance hierarchy, and approval path.
                </Mono>
              </div>

              <div style={{ marginTop: 28 }}>
                <SectionLabel n="07" title="Initiative-Specific Review" hint="AI layer — adds nuance the baseline library can't" />
                {aiState === "idle" && (
                  <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 12, padding: 22, textAlign: "center" }}>
                    <p style={{ color: C.inkDim, fontSize: 13.5, lineHeight: 1.55, margin: "0 auto 14px", maxWidth: 520 }}>The matrix above is the curated baseline. This step asks the AI layer to surface considerations specific to your exact initiative that a generic library would miss.</p>
                    <button onClick={deepenWithAI} style={{ background: `${C.violet}1F`, border: `1px solid ${C.violet}55`, color: C.violet, borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Deepen with AI →</button>
                  </div>
                )}
                {aiState === "no-key" && (
                  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22, textAlign: "center" }}>
                    <p style={{ color: C.inkDim, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>The AI layer requires an API key to run. Copy <Mono style={{ color: C.ink }}>.env.example</Mono> to <Mono style={{ color: C.ink }}>.env</Mono> and add your Anthropic API key, then restart the dev server. The curated baseline above stands on its own — this feature is additive.</p>
                  </div>
                )}
                {aiState === "loading" && (
                  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22, color: C.inkDim, fontSize: 13.5 }}><Mono style={{ color: C.violet }}>Analyzing initiative-specific exposure…</Mono></div>
                )}
                {aiState === "error" && (
                  <div style={{ background: C.redSoft, border: `1px solid ${C.red}40`, borderRadius: 12, padding: 18, color: C.inkDim, fontSize: 13.5 }}>The AI layer couldn't be reached. The curated baseline above stands on its own — that's the point of grounding the product in a real library rather than the model alone.</div>
                )}
                {aiState === "done" && aiNotes && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {aiNotes.map((n, i) => (
                      <div key={i} style={{ background: C.panel, border: `1px solid ${C.violet}33`, borderLeft: `3px solid ${C.violet}`, borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 5, lineHeight: 1.4 }}>{n.watch}</div>
                        <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}><Mono style={{ color: C.violet, fontSize: 11 }}>WHY · </Mono>{n.why}</div>
                      </div>
                    ))}
                    <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>AI-generated · review before relying. This layer is assistive; the practitioner remains accountable.</Mono>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 36, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 4, alignSelf: "stretch", background: C.amber, borderRadius: 99, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 5 }}>This is a decision-support draft, not a professional opinion.</div>
                    <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.6 }}>The engine accelerates assessment by surfacing a curated, consistent baseline. A qualified practitioner must review, tailor, and own the result. Output does not constitute an audit opinion, a QSA assessment, or legal advice.</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {!submitted && (
          <section style={{ marginTop: 8, paddingTop: 36, borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="grid2">
              <Why title="The moat is the library, not the model" body="Anyone can wrap an LLM. The defensible asset is the curated risk-control-framework-evidence graph — versioned, editor-owned, improving with every assessment." />
              <Why title="Every line is inspectable" body="Click any risk or control to see its source entry: statement, owner, frequency, and the evidence an auditor expects. Unsourced output has no place in GRC." />
              <Why title="Assistive by design" body="Positioned as acceleration of a practitioner's judgment — never a replacement. That framing is both honest and the thing that keeps the product legally viable." />
            </div>
          </section>
        )}
        </>
        ) : (
          <LibraryBrowser onOpen={setDrawer} />
        )}
      </main>
    </div>
  );
}
