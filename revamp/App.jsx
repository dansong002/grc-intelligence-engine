import React, { useState, useMemo, useRef, useEffect } from "react";
import "./app.css";
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
  CONVERGENCE,
  SCF_VERSION,
  SCF_DOMAINS,
  SCF_CONTROLS,
  SCF_MAPPING,
  BIA_DIMENSIONS,
  BIA_PROFILES,
  MATURITY_LEVELS,
  MATURITY_PROFILES,
  CONTROL_AUDIT,
  FRAMEWORKS,
  FRAMEWORK_REQUIREMENTS,
  FRAMEWORK_ALIASES,
  CONTROL_FRAMEWORK_MAP,
  INDUSTRIES,
} from "../src/knowledge.js";

/* ============================================================================
 * GRC INTELLIGENCE ENGINE — prototype (v0.2.0) · "Nocturne" revamp theme
 * Logic and knowledge library are unchanged from the original; this copy only
 * restyles the surface. The brand accent moved from amber -> azure, and the
 * "High" severity rating now uses its own dedicated warm `orange` so the
 * rebrand of the accent no longer changes what a High-rated risk looks like.
 * ==========================================================================*/

const C = {
  canvas: "#0A0F17", panel: "#131C27", panelHi: "#1B2733", line: "#293643",
  ink: "#EEF4F9", inkDim: "#9CB0BF", inkFaint: "#71828F",
  accent: "#4C8DFF", accentSoft: "#162439",   // azure brand accent
  orange: "#F5A623", orangeSoft: "#3A2E18",     // reserved for High severity
  red: "#EF5B52", redSoft: "#3A1E1C",
  teal: "#3EC9B6", tealSoft: "#123230", violet: "#9385E6",
};
const RATING_COLOR = { Critical: C.red, High: C.orange, Medium: C.teal, Low: C.inkDim };
const TYPE_COLOR = { Preventive: C.teal, Detective: C.violet, Corrective: C.orange };

// Reverse index of the control crosswalk: framework id -> requirement ref -> control ids.
// Lets the framework reference cards show which controls satisfy each requirement.
const REQUIREMENT_CONTROLS = {};
Object.entries(CONTROL_FRAMEWORK_MAP).forEach(([cid, fws]) => {
  Object.entries(fws).forEach(([fwId, refs]) => {
    if (!REQUIREMENT_CONTROLS[fwId]) REQUIREMENT_CONTROLS[fwId] = {};
    refs.forEach((ref) => {
      if (!REQUIREMENT_CONTROLS[fwId][ref]) REQUIREMENT_CONTROLS[fwId][ref] = [];
      if (!REQUIREMENT_CONTROLS[fwId][ref].includes(cid)) REQUIREMENT_CONTROLS[fwId][ref].push(cid);
    });
  });
});

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

function parseFrameworkRef(str) {
  const s = str.trim();
  for (const [alias, fwId] of Object.entries(FRAMEWORK_ALIASES)) {
    if (s === alias || s.startsWith(alias + ":") || s.startsWith(alias + " ")) {
      const rest = s.slice(alias.length).replace(/^[\s:]+/, "").trim();
      return { fwId, ref: rest || null };
    }
  }
  const colon = s.indexOf(":");
  if (colon > 0) {
    const prefix = s.slice(0, colon).trim();
    const candidateId = FRAMEWORK_ALIASES[prefix];
    if (candidateId) return { fwId: candidateId, ref: s.slice(colon + 1).trim() || null };
  }
  return { fwId: null, ref: s };
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
  risks.forEach((r) => r.frameworks.forEach((f) => {
    const parsed = parseFrameworkRef(f);
    if (parsed.fwId && FRAMEWORKS[parsed.fwId]) fw.add(parsed.fwId);
  }));

  // Precise framework scope from the curated control → requirement crosswalk.
  // For every in-scope control, attach it to the exact requirement it satisfies
  // in each framework. This also widens the implicated-framework set to any
  // framework a control maps to (e.g. COBIT) even if no risk string cited it.
  const frameworkScope = {};
  controls.forEach((c) => {
    const cid = c.control.id;
    const map = CONTROL_FRAMEWORK_MAP[cid];
    if (!map) return;
    Object.entries(map).forEach(([fwId, refs]) => {
      if (!FRAMEWORKS[fwId]) return;
      fw.add(fwId);
      if (!frameworkScope[fwId]) frameworkScope[fwId] = {};
      refs.forEach((ref) => {
        if (!frameworkScope[fwId][ref]) frameworkScope[fwId][ref] = { controlIds: [] };
        if (!frameworkScope[fwId][ref].controlIds.includes(cid)) frameworkScope[fwId][ref].controlIds.push(cid);
      });
    });
  });
  // Frameworks implicated, ordered with the two highlighted standards first.
  const FW_PRIORITY = { "SOX-ITGC": 0, "PCI-DSS": 1 };
  const frameworkIds = Array.from(fw).filter((id) => FRAMEWORKS[id]).sort((a, b) => {
    const pa = FW_PRIORITY[a] ?? 9, pb = FW_PRIORITY[b] ?? 9;
    if (pa !== pb) return pa - pb;
    return FRAMEWORKS[a].name.localeCompare(FRAMEWORKS[b].name);
  });

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

  const convergence = CONVERGENCE.filter((c) => riskIds.includes(c.spineRisk));

  // Business Impact Analysis — worst case per dimension across active archetypes.
  const bia = BIA_DIMENSIONS.map((dim) => {
    let best = null;
    active.forEach((m) => {
      const profile = BIA_PROFILES[m.archetype.id];
      const cell = profile && profile[dim.id];
      if (cell && (!best || RATING_VALUE[cell.rating] > RATING_VALUE[best.rating])) {
        best = cell;
      }
    });
    return { id: dim.id, label: dim.label, rating: best ? best.rating : "Low", note: best ? best.note : "" };
  });
  const biaOverall = VALUE_RATING[Math.max(1, ...bia.map((d) => RATING_VALUE[d.rating]))];

  // Maturity model — one entry per in-scope risk domain that has a curated profile.
  const domainsInScope = [];
  risks.forEach((r) => { if (!domainsInScope.includes(r.domain)) domainsInScope.push(r.domain); });
  const maturity = domainsInScope
    .filter((d) => MATURITY_PROFILES[d])
    .map((d) => ({ domain: d, ...MATURITY_PROFILES[d] }));

  // Executive summary inputs.
  const topRisks = [...risks].sort((a, b) => RATING_VALUE[b.inherent] - RATING_VALUE[a.inherent]).slice(0, 3);
  const topControls = [...controls].sort((a, b) => {
    if (b.addresses.length !== a.addresses.length) return b.addresses.length - a.addresses.length;
    return (CONTROL_REDUCTION[b.control.type] || 0) - (CONTROL_REDUCTION[a.control.type] || 0);
  }).slice(0, 3);

  // Go / No-Go — deterministic, from the TARGET residual posture.
  const residualHC = residualDist.Critical + residualDist.High;
  const inherentHC = inherentDist.Critical + inherentDist.High;
  let recommendation;
  if (residualDist.Critical > 0) {
    recommendation = { decision: "Hold", tone: "red",
      rationale: residualDist.Critical + " risk" + (residualDist.Critical === 1 ? " remains" : "s remain") + " Critical even after the recommended controls. Redesign the approach or add compensating controls before proceeding." };
  } else if (residualHC > 0) {
    recommendation = { decision: "Proceed with conditions", tone: "amber",
      rationale: residualHC + " high/critical risk" + (residualHC === 1 ? "" : "s") + " remain after the recommended controls are in place. Proceed only with senior sign-off and a tracked plan to close them." };
  } else {
    recommendation = { decision: "Proceed", tone: "teal",
      rationale: "With the recommended controls implemented and operating effectively, target residual risk lands within tolerance. Proceed while holding the implementation plan accountable." };
  }

  return {
    archetypes: active.map((a) => ({ ...a.archetype, matched: a.matched })),
    risks, controls, docsByTier, docCount, convergence,
    frameworks: frameworkIds.map((id) => FRAMEWORKS[id]),
    frameworkIds,
    frameworkScope,
    inherentDist, residualDist,
    inherentHC, residualHC,
    bia, biaOverall, maturity, topRisks, topControls, recommendation,
  };
}

function Mono({ children, style }) {
  return <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", ...style }}>{children}</span>;
}
function Pill({ children, color, soft }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500,
      letterSpacing: "0.03em", color, background: soft, padding: "3px 9px",
      borderRadius: 4, border: `1px solid ${color}33`, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
function Dot({ color }) {
  return <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 99, background: color, flexShrink: 0 }} />;
}
// Severity as a distinct SHAPE (not color alone): triangle/diamond/circle/dash.
// Lets color-blind reviewers read Critical/High/Medium/Low without relying on hue.
function SevIcon({ level, size = 10 }) {
  const c = RATING_COLOR[level] || C.inkDim;
  const common = { width: size, height: size, viewBox: "0 0 12 12", focusable: "false", "aria-hidden": "true", style: { flexShrink: 0, display: "block" } };
  if (level === "Critical") return <svg {...common}><path d="M6 1 L11 10.5 H1 Z" fill={c} /></svg>;
  if (level === "High") return <svg {...common}><path d="M6 1 L11 6 L6 11 L1 6 Z" fill={c} /></svg>;
  if (level === "Medium") return <svg {...common}><circle cx="6" cy="6" r="4.4" fill={c} /></svg>;
  return <svg {...common}><rect x="1.5" y="5" width="9" height="2.2" rx="1.1" fill={c} /></svg>;
}
// Brand mark: a 3-node graph triad — the engine's thesis is a navigable
// risk↔control↔framework knowledge graph, so the logo says exactly that.
function BrandMark({ size = 26 }) {
  const g = Math.round(size * 0.66);
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={g} height={g} viewBox="0 0 24 24" fill="none">
        <path d="M12 6.8 L6.8 16.4 L17.2 16.4 Z" stroke="#F5FAFF" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="12" cy="6.8" r="2.5" fill="#F5FAFF" />
        <circle cx="6.8" cy="16.4" r="2.5" fill="#F5FAFF" />
        <circle cx="17.2" cy="16.4" r="2.5" fill="#F5FAFF" />
      </svg>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", color: C.inkFaint, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      <div style={{ color: C.inkDim, fontSize: 13.5, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function SourceDrawer({ item, kind, onClose, onNavigate }) {
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
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end", background: "rgba(6,10,13,0.6)", backdropFilter: "blur(2px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", height: "100%", background: C.panel, borderLeft: `1px solid ${C.line}`, padding: "28px 26px", overflowY: "auto", boxShadow: "-20px 0 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <Pill color={C.inkFaint} soft="transparent">LIBRARY SOURCE · {kind}</Pill>
          <button ref={closeRef} onClick={onClose} aria-label="Close panel" style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.inkDim, borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        <Mono style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{item.id}</Mono>
        <h3 style={{ color: C.ink, fontSize: 18, fontWeight: 600, margin: "8px 0 16px", lineHeight: 1.35 }}>{item.title}</h3>

        {kind === "RISK" && (
          <>
            <Field label="Domain · Class">{item.domain} · {item.class}</Field>
            <Field label="Risk statement"><span style={{ color: C.ink }}>{item.statement}</span></Field>
            <Field label="Inherent rating">
              <Pill color={RATING_COLOR[item.inherent]} soft={`${RATING_COLOR[item.inherent]}1A`}><SevIcon level={item.inherent} /> {item.inherent}</Pill>
            </Field>
            {item.residual && (
              <Field label="Target residual (with controls in place)">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Pill color={RATING_COLOR[item.inherent]} soft={`${RATING_COLOR[item.inherent]}1A`}>{item.inherent}</Pill>
                  <span style={{ color: C.inkFaint }}>{"→"}</span>
                  <Pill color={RATING_COLOR[item.residual.residual]} soft={`${RATING_COLOR[item.residual.residual]}1A`}><SevIcon level={item.residual.residual} />{item.residual.residual}</Pill>
                </div>
                <Mono style={{ fontSize: 12, color: C.inkFaint, lineHeight: 1.55 }}>{reductionLine}</Mono>
                <div style={{ fontSize: 11.5, color: C.inkFaint, lineHeight: 1.5, marginTop: 8, fontStyle: "italic" }}>Target residual assumes the mapped controls are implemented and operating. It is not current-state.</div>
              </Field>
            )}
            <Field label="Mitigating controls">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {item.controls.map((c) => <ChipLink key={c} label={c} onClick={() => onNavigate && onNavigate(c, "CONTROL")} />)}
              </div>
            </Field>
            <Field label="Frameworks implicated">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {item.frameworks.map((f) => <span key={f} style={{ color: C.violet, fontSize: 13 }}>{f}</span>)}
              </div>
            </Field>
            {(() => { const paths = CONVERGENCE.filter((c) => c.spineRisk === item.id); return paths.length > 0 ? (
              <Field label={"Convergence cascades (" + paths.length + ")"}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {paths.map((p) => (
                    <div key={p.id} style={{ background: C.panelHi, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <Mono style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>{p.id}</Mono>
                        <Pill color={C.red} soft={`${C.red}18`}>{p.impactDomain}</Pill>
                      </div>
                      <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45 }}>{p.chain.join(" → ")}</div>
                    </div>
                  ))}
                </div>
              </Field>
            ) : null; })()}
          </>
        )}

        {kind === "CONTROL" && (
          <>
            <Field label="Control type"><Pill color={TYPE_COLOR[item.type]} soft={`${TYPE_COLOR[item.type]}1A`}>{item.type}</Pill></Field>
            <Field label="Control statement"><span style={{ color: C.ink }}>{item.statement}</span></Field>
            {(() => { const risks = Object.values(RISKS).filter((r) => r.controls.includes(item.id)); return risks.length > 0 ? (
              <Field label="Addresses risks">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {risks.map((r) => <ChipLink key={r.id} label={r.id} color={RATING_COLOR[r.inherent]} onClick={() => onNavigate && onNavigate(r.id, "RISK")} />)}
                </div>
              </Field>
            ) : null; })()}
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
            {SCF_MAPPING[item.id] && (
              <Field label={"SCF " + SCF_VERSION + " cross-reference"}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SCF_MAPPING[item.id].map((sid) => {
                    const s = SCF_CONTROLS[sid];
                    return s ? (
                      <div key={sid} style={{ background: C.panelHi, borderRadius: 6, padding: "8px 10px", border: `1px solid ${C.line}` }}>
                        <Mono style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{s.id}</Mono>
                        <div style={{ fontSize: 12.5, color: C.ink, marginTop: 3, fontWeight: 500 }}>{s.title}</div>
                        <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </Field>
            )}
            {(() => {
              const map = CONTROL_FRAMEWORK_MAP[item.id];
              if (!map) return null;
              const fwIds = Object.keys(map).filter((id) => FRAMEWORKS[id]).sort((a, b) => FRAMEWORKS[a].name.localeCompare(FRAMEWORKS[b].name));
              const totalRefs = fwIds.reduce((n, fid) => n + map[fid].length, 0);
              return fwIds.length > 0 ? (
                <Field label={"Framework cross-reference (" + totalRefs + " requirements across " + fwIds.length + " frameworks)"}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {fwIds.map((fid) => {
                      const fwk = FRAMEWORKS[fid];
                      const accent = fwk.kind === "regulation" ? C.red : C.violet;
                      return (
                        <div key={fid} style={{ background: C.panelHi, borderRadius: 6, padding: "8px 10px", border: `1px solid ${C.line}` }}>
                          <div onClick={() => onNavigate && onNavigate(fid, "FRAMEWORK")} role="button" tabIndex={0}
                            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && onNavigate) { e.preventDefault(); onNavigate(fid, "FRAMEWORK"); } }}
                            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, cursor: "pointer" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: accent }}>{fwk.name}</span>
                            <Mono style={{ fontSize: 10, color: C.inkFaint }}>{fwk.version}</Mono>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {map[fid].map((ref) => {
                              const meta = (FRAMEWORK_REQUIREMENTS[fid] || []).find((r) => r.ref === ref);
                              return (
                                <span key={ref} title={meta ? meta.title : ref} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: C.ink, background: `${accent}14`, border: `1px solid ${accent}33`, padding: "2px 7px", borderRadius: 5 }}>{ref}</span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Field>
              ) : null;
            })()}
          </>
        )}

        {kind === "RISK-INTAKE" && (
          <>
            <Field label="Status"><Pill color={C.accent} soft={`${C.accent}1A`}>Coming soon</Pill></Field>
            <Field label="Vision">
              <span style={{ color: C.ink }}>Connecting to your organization's live risk register transforms the engine from a greenfield generator into a risk-intake accelerator.</span>
            </Field>
            <Field label="What it enables">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: C.panelHi, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.teal, marginBottom: 3 }}>Gap detection</div>
                  <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45 }}>Compare the engine's curated library against your existing register to surface risks and controls you have not yet addressed.</div>
                </div>
                <div style={{ background: C.panelHi, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.accent, marginBottom: 3 }}>Write-back</div>
                  <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45 }}>Accept engine-generated items as draft entries in your register, complete with control mappings and framework references, ready for practitioner review.</div>
                </div>
              </div>
            </Field>
            <Field label="Compatible sources">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["ServiceNow GRC/IRM", "RSA Archer", "AuditBoard", "LogicGate", "OneTrust", "Jira", "CSV / Excel"].map((s) => (
                  <span key={s} style={{ fontSize: 11.5, color: C.inkDim, background: C.panelHi, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.line}` }}>{s}</span>
                ))}
              </div>
            </Field>
            <div style={{ marginTop: 16, padding: "12px 14px", background: `${C.accent}0F`, border: `1px solid ${C.accent}33`, borderRadius: 8, fontSize: 12, color: C.inkDim, lineHeight: 1.5 }}>
              This is a preview of a planned capability. No data is exchanged today. Interested in early access? The feature roadmap is shaped by practitioner feedback.
            </div>
          </>
        )}

        {kind === "ARCHETYPE" && (
          <>
            <Field label="Hint">{item.hint}</Field>
            <Field label={"Signals (" + item.signals.length + ")"}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {item.signals.map((s, i) => <Mono key={i} style={{ fontSize: 10.5, color: C.inkDim, background: C.panelHi, padding: "2px 7px", borderRadius: 4 }}>{s}</Mono>)}
              </div>
            </Field>
            <Field label={"Triggered risks (" + item.risks.length + ")"}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {item.risks.filter((rid) => RISKS[rid]).map((rid) => <ChipLink key={rid} label={rid} color={RATING_COLOR[RISKS[rid].inherent]} onClick={() => onNavigate && onNavigate(rid, "RISK")} />)}
              </div>
            </Field>
            {BIA_PROFILES[item.id] && (
              <Field label="BIA profile">
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {BIA_DIMENSIONS.map((dim) => {
                    const cell = BIA_PROFILES[item.id][dim.id];
                    return cell ? (
                      <div key={dim.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 90, fontSize: 12, color: C.inkDim, flexShrink: 0 }}>{dim.label}</span>
                        <Pill color={RATING_COLOR[cell.rating]} soft={`${RATING_COLOR[cell.rating]}1A`}><SevIcon level={cell.rating} />{cell.rating}</Pill>
                        <span style={{ fontSize: 11.5, color: C.inkFaint }}>{cell.note}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </Field>
            )}
          </>
        )}

        {kind === "FRAMEWORK" && (
          <>
            <Field label="Type"><Pill color={item.kind === "regulation" ? C.red : C.violet} soft={`${item.kind === "regulation" ? C.red : C.violet}1A`}>{item.kind === "regulation" ? "Regulation" : "Control Framework"}</Pill></Field>
            <Field label="Version"><Mono style={{ color: C.ink }}>{item.version}</Mono></Field>
            <Field label="Publisher">{item.publisher}</Field>
            {item.date && <Field label="Date">{item.date}</Field>}
            {item.jurisdiction && <Field label="Jurisdiction">{item.jurisdiction}</Field>}
            {item.url && <Field label="Official reference"><a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: C.teal, fontSize: 13 }}>{item.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗</a></Field>}
            <Field label="Summary"><span style={{ color: C.ink }}>{item.summary}</span></Field>
            {item.note && <Field label="Note"><span style={{ color: C.inkDim, fontStyle: "italic" }}>{item.note}</span></Field>}
            {FRAMEWORK_REQUIREMENTS[item.id] && (
              <Field label={"Requirements / objectives (" + FRAMEWORK_REQUIREMENTS[item.id].length + ")"}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {FRAMEWORK_REQUIREMENTS[item.id].map((req) => {
                    const mappedCtls = (REQUIREMENT_CONTROLS[item.id] || {})[req.ref] || [];
                    return (
                    <div key={req.ref} style={{ background: C.panelHi, borderRadius: 6, padding: "8px 10px", border: `1px solid ${C.line}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <Mono style={{ fontSize: 11, color: C.violet, fontWeight: 600 }}>{req.ref}</Mono>
                        <span style={{ fontSize: 11, color: C.inkFaint }}>{req.group}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: C.ink, fontWeight: 500 }}>{req.title}</div>
                      <div style={{ fontSize: 11.5, color: C.inkDim, marginTop: 2, lineHeight: 1.4 }}>{req.intent}</div>
                      {mappedCtls.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                          <span style={{ fontSize: 10, color: C.inkFaint, alignSelf: "center" }}>Satisfied by</span>
                          {mappedCtls.map((cid) => <ChipLink key={cid} label={cid} color={C.teal} onClick={() => onNavigate && onNavigate(cid, "CONTROL")} />)}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </Field>
            )}
            {(() => {
              const mapped = Object.values(RISKS).filter((r) => r.frameworks.some((f) => {
                const p = parseFrameworkRef(f);
                return p.fwId === item.id;
              }));
              return mapped.length > 0 ? (
                <Field label={"Risks referencing this " + (item.kind === "regulation" ? "regulation" : "framework") + " (" + mapped.length + ")"}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {mapped.map((r) => <ChipLink key={r.id} label={r.id} color={RATING_COLOR[r.inherent]} onClick={() => onNavigate && onNavigate(r.id, "RISK")} />)}
                  </div>
                </Field>
              ) : null;
            })()}
          </>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.inkFaint, lineHeight: 1.6 }}>This entry comes from the curated knowledge library (v{LIBRARY_VERSION}), cross-referenced with SCF {SCF_VERSION}.</div>
      </div>
    </div>
  );
}

function StatCard({ n, label, color }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "16px 16px" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 600, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: C.inkDim, marginTop: 7 }}>{label}</div>
    </div>
  );
}
function SectionLabel({ n, title, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <Mono style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{n}</Mono>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 4, marginLeft: 22 }}>{hint}</div>
    </div>
  );
}
function Card({ children, onClick }) {
  return (
    <div data-card onClick={onClick} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all .15s" }}
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

// Gap 1 — orientation at the point of use. Three steps + the determinism promise.
function HowItWorks({ onExploreLibrary }) {
  const steps = [
    { n: "1", t: "Describe", d: "Write a plain-language description of a technology initiative. Name the system, the data it handles, and key integrations. The more concrete, the better the match." },
    { n: "2", t: "Generate", d: "The engine classifies it against curated archetypes using rules, not a model. It assembles risks, controls, audit evidence, framework obligations, a maturity read, and a go/no-go." },
    { n: "3", t: "Drill in", d: "Every ID is a link. Open any risk, control, or framework to see its sourced entry, how it connects to the rest of the knowledge graph, then export the package as a standalone brief." },
  ];
  return (
    <section style={{ marginTop: 6, paddingTop: 30 }}>
      <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.accent }}>HOW IT WORKS</Mono>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 14 }} className="grid2">
        {steps.map((s) => (
          <div key={s.n} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: `${C.accent}1A`, border: `1px solid ${C.accent}55`, color: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{s.n}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{s.t}</span>
            </div>
            <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.55 }}>{s.d}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, color: C.inkFaint, lineHeight: 1.55 }}>
        <Mono style={{ color: C.teal }}>Rules-based and reproducible</Mono> · the same initiative always produces the same package · every line traces to a source · runs entirely in your browser, no data leaves the page.
        {onExploreLibrary && <> · <span role="button" tabIndex={0} onClick={onExploreLibrary} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onExploreLibrary(); } }} style={{ color: C.teal, cursor: "pointer", fontWeight: 600 }}>Explore the Library →</span></>}
      </div>
    </section>
  );
}

// Gap 4 — make the color conventions and the residual caveat persistent, not footnoted.
function Legend() {
  const sw = (color, label) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.inkDim }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: "inline-block", flexShrink: 0 }} /> {label}
    </span>
  );
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 18, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 11, flexWrap: "wrap", alignItems: "center" }}>
        <Mono style={{ fontSize: 9.5, color: C.inkFaint, letterSpacing: "0.06em" }}>RISK</Mono>
        {sw(C.red, "Critical")}{sw(C.accent, "High")}{sw(C.teal, "Medium")}{sw(C.inkDim, "Low")}
      </div>
      <div style={{ width: 1, height: 16, background: C.line }} />
      <div style={{ display: "flex", gap: 11, flexWrap: "wrap", alignItems: "center" }}>
        <Mono style={{ fontSize: 9.5, color: C.inkFaint, letterSpacing: "0.06em" }}>CONTROL</Mono>
        {sw(C.teal, "Preventive")}{sw(C.violet, "Detective")}{sw(C.accent, "Corrective")}
      </div>
      <div style={{ flex: 1, minWidth: 240, fontSize: 11.5, color: C.inkFaint, lineHeight: 1.5 }}>
        <strong style={{ color: C.inkDim, fontWeight: 600 }}>Residual&#42;</strong> = posture after controls are implemented &amp; operating, not current state. <strong style={{ color: C.inkDim, fontWeight: 600 }}>Maturity "current"</strong> is an assumed baseline.
      </div>
    </div>
  );
}

// Gap 3 — a sticky outline of the generated package with scroll-spy.
function SectionNav({ sections }) {
  const [active, setActive] = useState(sections[0] ? sections[0].id : null);
  useEffect(() => {
    const compute = () => {
      let cur = sections[0] ? sections[0].id : null;
      for (const s of sections) {
        const el = document.getElementById("sec-" + s.id);
        if (el && el.getBoundingClientRect().top <= 140) cur = s.id;
      }
      setActive(cur);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute, { passive: true });
    return () => { window.removeEventListener("scroll", compute); window.removeEventListener("resize", compute); };
  }, [sections]);
  const go = (id) => { const el = document.getElementById("sec-" + id); if (!el) return; const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); };
  return (
    <nav aria-label="Package sections" style={{ position: "sticky", top: 57, zIndex: 15, background: `${C.canvas}E6`, backdropFilter: "blur(10px)", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, margin: "0 -24px 24px", padding: "8px 24px", display: "flex", gap: 6, overflowX: "auto" }}>
      {sections.map((s, i) => {
        const on = active === s.id;
        return (
          <button key={s.id} onClick={() => go(s.id)} title={s.title} aria-current={on ? "true" : undefined} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, background: on ? C.panelHi : "transparent", border: `1px solid ${on ? C.accent + "66" : C.line}`, color: on ? C.ink : C.inkDim, borderRadius: 7, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: on ? C.accent : C.inkFaint }}>{String(i + 1).padStart(2, "0")}</span>
            {s.title}
          </button>
        );
      })}
    </nav>
  );
}

/* ---- convergence flow visual ---- */
function CascadeFlow({ chain, spineRisk, impactDomain, onRiskClick }) {
  const nodeColors = [
    { bg: C.accentSoft, border: C.accent, text: C.accent },
    { bg: C.panelHi, border: C.inkFaint, text: C.inkDim },
    { bg: C.redSoft, border: C.red, text: C.red },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "4px 0" }}>
      {chain.map((step, i) => {
        const colors = nodeColors[Math.min(i, nodeColors.length - 1)];
        const isLast = i === chain.length - 1;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 99, border: `2px solid ${colors.border}`,
                  background: colors.bg, boxShadow: `0 0 8px ${colors.border}44`,
                }} />
              </div>
              <div style={{
                flex: 1, background: colors.bg, border: `1px solid ${colors.border}40`,
                borderRadius: 8, padding: "10px 14px",
              }}>
                <div style={{ fontSize: 13, fontWeight: isLast ? 600 : 400, color: colors.text, lineHeight: 1.4 }}>{step}</div>
                {i === 0 && spineRisk && (
                  <div style={{ marginTop: 5 }}>
                    <Mono style={{ fontSize: 10, color: C.inkFaint }}>SPINE RISK: </Mono>
                    <Mono onClick={onRiskClick} style={{ fontSize: 10, color: C.teal, cursor: onRiskClick ? "pointer" : "default", textDecorationLine: onRiskClick ? "underline" : "none", textDecorationColor: `${C.teal}55`, textUnderlineOffset: 2 }}>{spineRisk}</Mono>
                  </div>
                )}
                {isLast && impactDomain && (
                  <div style={{ marginTop: 6 }}>
                    <Pill color={C.red} soft={`${C.red}18`}>{impactDomain}</Pill>
                  </div>
                )}
              </div>
            </div>
            {!isLast && (
              <div style={{ display: "flex", alignItems: "center", width: 28, flexShrink: 0 }}>
                <div style={{ width: 1, height: 20, background: `${C.inkFaint}44`, marginLeft: 13.5 }}>
                  <svg width="7" height="20" viewBox="0 0 7 20" style={{ display: "block", marginLeft: -3 }}>
                    <line x1="3.5" y1="0" x2="3.5" y2="14" stroke={C.inkFaint} strokeWidth="1" strokeOpacity="0.35" />
                    <polygon points="0.5,14 6.5,14 3.5,19" fill={C.inkFaint} fillOpacity="0.5" />
                  </svg>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
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
          fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function ChipLink({ label, onClick, color }) {
  const c = color || C.teal;
  return (
    <span onClick={onClick} role="button" tabIndex={0} title="Open source entry →"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick && onClick(); } }}
      onMouseEnter={(e) => { e.currentTarget.style.background = c + "26"; e.currentTarget.style.borderColor = c + "99"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = c + "10"; e.currentTarget.style.borderColor = c + "44"; }}
      style={{ display: "inline-flex", alignItems: "center", gap: 3, minHeight: 24, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: c, border: `1px solid ${c}44`, padding: "0 7px 0 9px", borderRadius: 5, cursor: "pointer", background: c + "10", transition: "background .12s, border-color .12s" }}>
      {label}<span aria-hidden="true" style={{ fontSize: 8.5, opacity: 0.7, marginTop: -1 }}>↗</span>
    </span>
  );
}

function EmptyNote({ text }) {
  return (
    <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 11, padding: "26px 18px", textAlign: "center", color: C.inkFaint, fontSize: 13.5, lineHeight: 1.5 }}>{text}</div>
  );
}

function LibraryBrowser({ onOpen, onNavigate }) {
  const [tab, setTab] = useState("risks");
  const [q, setQ] = useState("");
  const [expandedDomain, setExpandedDomain] = useState(null);
  const ql = q.trim().toLowerCase();

  const allRisks = Object.values(RISKS);
  const allControls = Object.values(CONTROLS);

  const allFrameworks = Object.values(FRAMEWORKS);
  const fwControlFrameworks = allFrameworks.filter((f) => f.kind === "framework");
  const fwRegulations = allFrameworks.filter((f) => f.kind === "regulation");

  const risks = allRisks.filter((r) => !ql || (r.id + " " + r.title + " " + r.domain + " " + r.class).toLowerCase().includes(ql));
  const controls = allControls.filter((c) => !ql || (c.id + " " + c.title + " " + c.type + " " + c.owner).toLowerCase().includes(ql));
  const arches = ARCHETYPES.filter((a) => !ql || (a.label + " " + a.hint + " " + a.signals.join(" ")).toLowerCase().includes(ql));
  const fws = allFrameworks.filter((f) => !ql || (f.id + " " + f.name + " " + f.version + " " + f.publisher).toLowerCase().includes(ql));
  const convs = CONVERGENCE.filter((c) => !ql || (c.id + " " + c.spineLabel + " " + c.impactDomain + " " + c.impact).toLowerCase().includes(ql));
  const scfDomains = SCF_DOMAINS.filter((d) => !ql || (d.id + " " + d.name).toLowerCase().includes(ql));

  const tabs = [
    { id: "risks", label: "Risks (" + allRisks.length + ")" },
    { id: "controls", label: "Controls (" + allControls.length + ")" },
    { id: "convergence", label: "Convergence (" + CONVERGENCE.length + ")" },
    { id: "archetypes", label: "Archetypes (" + ARCHETYPES.length + ")" },
    { id: "frameworks", label: "Frameworks (" + allFrameworks.length + ")" },
    { id: "industries", label: "Industries (" + INDUSTRIES.length + ")" },
  ];
  const showFilter = tab === "risks" || tab === "controls" || tab === "archetypes" || tab === "convergence" || tab === "frameworks" || tab === "industries";

  return (
    <section style={{ paddingTop: 40, paddingBottom: 20 }}>
      <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.accent }}>THE CURATED LIBRARY</Mono>
      <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "14px 0 12px", maxWidth: 720 }}>The asset, as data.</h1>
      <p style={{ color: C.inkDim, fontSize: 15.5, lineHeight: 1.55, maxWidth: 640, margin: "0 0 22px" }}>
        Every risk and control the engine draws on, with its framework mapping, owner, and the evidence an auditor expects. This curated graph (not the model) is what makes the output consistent and defensible. Click any entry to inspect its source.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Segmented tabs={tabs} active={tab} onChange={(id) => { setTab(id); setQ(""); }} />
        {showFilter && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 12px", color: C.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", minWidth: 180 }} />
        )}
      </div>

      {tab === "risks" && (<>
        <div style={{ background: C.panel, border: `1px dashed ${C.accent}44`, borderRadius: 11, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: C.ink }}>Have an existing risk register?</span> Connect it to detect gaps against the curated library and draft new entries automatically.
          </div>
          <button onClick={() => onOpen({ item: { id: "RISK-INTAKE", title: "Connect Your Risk Register" }, kind: "RISK-INTAKE" })} style={{ background: `${C.accent}1A`, border: `1px solid ${C.accent}55`, color: C.accent, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>Connect register →</button>
        </div>
      </>)}
      {tab === "risks" && (risks.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="grid2">
          {risks.map((r) => (
            <Card key={r.id} onClick={() => onOpen({ item: r, kind: "RISK" })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <Mono style={{ fontSize: 11, color: C.inkFaint }}>{r.id}</Mono>
                <Pill color={RATING_COLOR[r.inherent]} soft={`${RATING_COLOR[r.inherent]}1A`}><SevIcon level={r.inherent} />{r.inherent}</Pill>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{r.title}</div>
              <Mono style={{ fontSize: 10.5, color: C.inkFaint }}>{r.domain + " · " + r.class + " · " + r.controls.length + " controls"}<span style={{ color: C.accent, marginLeft: 6 }}>→ drill in</span></Mono>
            </Card>
          ))}
        </div>
      ) : <EmptyNote text={`No risks match "${q}" — try a different term.`} />)}

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
              {SCF_MAPPING[c.id] && (
                <div style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <Mono style={{ fontSize: 10, color: C.inkFaint }}>SCF</Mono>
                  {SCF_MAPPING[c.id].map((sid) => <Mono key={sid} style={{ fontSize: 10, color: C.accent }}>{sid}</Mono>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : <EmptyNote text={`No controls match "${q}" — try a different term.`} />)}

      {tab === "convergence" && (convs.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid2">
          {convs.map((c) => (
            <div key={c.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 18px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <Mono style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{c.id}</Mono>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.ink, flex: 1 }}>{c.spineLabel}</span>
              </div>
              <div style={{ flex: 1 }}>
                <CascadeFlow
                  chain={c.chain}
                  spineRisk={c.spineRisk}
                  impactDomain={c.impactDomain}
                  onRiskClick={() => { if (RISKS[c.spineRisk]) onOpen({ item: RISKS[c.spineRisk], kind: "RISK" }); }}
                />
              </div>
              <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>{c.impact}</div>
            </div>
          ))}
        </div>
      ) : <EmptyNote text={`No convergence pathways match "${q}" — try a different term.`} />)}

      {tab === "archetypes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {arches.map((a) => (
            <Card key={a.id} onClick={() => onOpen({ item: a, kind: "ARCHETYPE" })}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <Pill color={C.accent} soft={`${C.accent}1A`}>{a.label}</Pill>
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
            </Card>
          ))}
        </div>
      )}

      {tab === "scf" && (
        <div>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Mono style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>SCF {SCF_VERSION}</Mono>
              <span style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>Secure Controls Framework</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}>
              {SCF_DOMAINS.reduce((s, d) => s + d.count, 0).toLocaleString()} controls across {SCF_DOMAINS.length} domains. Each curated control in this library is cross-referenced to its SCF equivalent. Click any control to see the mapping.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }} className="grid2">
            {scfDomains.map((d) => {
              const mappedScfIds = Object.values(SCF_MAPPING).flat().filter((sid) => sid.startsWith(d.id + "-") || sid.startsWith(d.id.toLowerCase() + "-"));
              const mappedCount = mappedScfIds.length;
              const isExpanded = expandedDomain === d.id;
              const mappedCtls = mappedCount > 0 ? Object.entries(SCF_MAPPING).filter(([, sids]) => sids.some((sid) => sid.startsWith(d.id + "-") || sid.startsWith(d.id.toLowerCase() + "-"))).map(([ctlId, sids]) => ({ ctlId, scfIds: sids.filter((sid) => sid.startsWith(d.id + "-") || sid.startsWith(d.id.toLowerCase() + "-")) })) : [];
              return (
                <div key={d.id} style={{ background: C.panel, border: `1px solid ${isExpanded ? C.accent + "55" : C.line}`, borderRadius: 10, padding: "12px 14px", cursor: mappedCount > 0 ? "pointer" : "default", transition: "border-color .15s" }}
                  onClick={() => mappedCount > 0 && setExpandedDomain(isExpanded ? null : d.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{d.name}</div>
                      <Mono style={{ fontSize: 10.5, color: C.inkFaint, marginTop: 3, display: "block" }}>{d.id} · {d.count} controls</Mono>
                    </div>
                    {mappedCount > 0 && <Pill color={C.teal} soft={C.tealSoft}>{mappedCount} mapped {isExpanded ? "▾" : "▸"}</Pill>}
                  </div>
                  {isExpanded && mappedCtls.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
                      {mappedCtls.map(({ ctlId, scfIds }) => {
                        const ctl = CONTROLS[ctlId];
                        return (
                          <div key={ctlId} style={{ background: C.panelHi, borderRadius: 7, padding: "9px 11px", border: `1px solid ${C.line}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <ChipLink label={ctlId} onClick={() => onNavigate && onNavigate(ctlId, "CONTROL")} />
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{ctl ? ctl.title : ctlId}</span>
                            </div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                              {scfIds.map((sid) => {
                                const s = SCF_CONTROLS[sid];
                                return <Mono key={sid} style={{ fontSize: 10, color: C.accent }}>{sid}{s ? " — " + s.title : ""}</Mono>;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "frameworks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.violet }}>REFERENCE LIBRARY</Mono>
              <Pill color={C.violet} soft={`${C.violet}1A`}>{allFrameworks.length} frameworks & regulations</Pill>
            </div>
            <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.55 }}>
              Verified versions as of June 2026. Each entry carries paraphrased intent, never verbatim standard text. Click any entry for full detail, requirements, and the risks it governs.
            </div>
          </div>

          {[{ label: "Control Frameworks", items: fwControlFrameworks.filter((f) => fws.includes(f)), color: C.violet },
            { label: "Regulations", items: fwRegulations.filter((f) => fws.includes(f)), color: C.red }].map((group) => group.items.length > 0 && (
            <div key={group.label}>
              <Mono style={{ fontSize: 11, letterSpacing: "0.08em", color: group.color, marginBottom: 8, display: "block" }}>{group.label.toUpperCase()}</Mono>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="grid2">
                {group.items.map((fw) => {
                  const reqs = FRAMEWORK_REQUIREMENTS[fw.id] || [];
                  const isExpanded = expandedDomain === fw.id;
                  return (
                    <div key={fw.id} style={{ background: C.panel, border: `1px solid ${isExpanded ? C.violet + "66" : C.line}`, borderRadius: 11, padding: "14px 15px", cursor: "pointer", transition: "all .15s", gridColumn: isExpanded ? "1 / -1" : undefined }}
                      onClick={() => setExpandedDomain(isExpanded ? null : fw.id)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.panelHi; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        {fw.url ? <a href={fw.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 600, color: C.ink, textDecoration: "none", borderBottom: `1px dashed ${C.inkFaint}55` }}>{fw.name} <span style={{ fontSize: 10, opacity: 0.6 }}>↗</span></a> : <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{fw.name}</span>}
                        <Pill color={group.color} soft={`${group.color}1A`}>{fw.version}</Pill>
                      </div>
                      <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.45, marginBottom: 6 }}>{fw.summary}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <Mono style={{ fontSize: 10, color: C.inkFaint }}>{fw.publisher} · {fw.date}</Mono>
                        {reqs.length > 0 && <Mono style={{ fontSize: 10, color: C.violet }}>{reqs.length + " req" + (reqs.length === 1 ? "" : "s") + " cataloged"}</Mono>}
                        <span style={{ fontSize: 11, color: C.accent, marginLeft: "auto" }}>{isExpanded ? "▾ collapse" : "→ expand"}</span>
                      </div>
                      {fw.note && <div style={{ fontSize: 11.5, color: C.inkFaint, fontStyle: "italic", marginTop: 6, lineHeight: 1.4 }}>{fw.note}</div>}
                      {isExpanded && fw.id === "SCF" && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                          <Mono style={{ fontSize: 10, color: C.accent, letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>DOMAINS ({SCF_DOMAINS.length})</Mono>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }} className="grid2">
                            {SCF_DOMAINS.filter((d) => !ql || (d.id + " " + d.name).toLowerCase().includes(ql)).map((d) => {
                              const mappedScfIds = Object.values(SCF_MAPPING).flat().filter((sid) => sid.startsWith(d.id + "-") || sid.startsWith(d.id.toLowerCase() + "-"));
                              const mappedCount = mappedScfIds.length;
                              const isScfExpanded = expandedDomain === "scf-" + d.id;
                              const mappedCtls = mappedCount > 0 ? Object.entries(SCF_MAPPING).filter(([, sids]) => sids.some((sid) => sid.startsWith(d.id + "-") || sid.startsWith(d.id.toLowerCase() + "-"))).map(([ctlId, sids]) => ({ ctlId, scfIds: sids.filter((sid) => sid.startsWith(d.id + "-") || sid.startsWith(d.id.toLowerCase() + "-")) })) : [];
                              return (
                                <div key={d.id} style={{ background: C.panelHi, border: `1px solid ${isScfExpanded ? C.accent + "55" : C.line}`, borderRadius: 8, padding: "10px 12px", cursor: mappedCount > 0 ? "pointer" : "default" }}
                                  onClick={(e) => { e.stopPropagation(); if (mappedCount > 0) setExpandedDomain(isScfExpanded ? null : "scf-" + d.id); }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{d.name}</div>
                                  <Mono style={{ fontSize: 10, color: C.inkFaint, marginTop: 2, display: "block" }}>{d.id} · {d.count} controls</Mono>
                                  {mappedCount > 0 && <Mono style={{ fontSize: 10, color: C.teal, marginTop: 3, display: "block" }}>{mappedCount} mapped</Mono>}
                                  {isScfExpanded && mappedCtls.length > 0 && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 6 }}>
                                      {mappedCtls.map(({ ctlId, scfIds }) => {
                                        const ctl = CONTROLS[ctlId];
                                        return (
                                          <div key={ctlId}>
                                            <ChipLink label={ctlId} onClick={() => onNavigate && onNavigate(ctlId, "CONTROL")} />
                                            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.ink, marginLeft: 6 }}>{ctl ? ctl.title : ctlId}</span>
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                                              {scfIds.map((sid) => { const s = SCF_CONTROLS[sid]; return <Mono key={sid} style={{ fontSize: 10, color: C.accent }}>{sid}{s ? " — " + s.title : ""}</Mono>; })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {isExpanded && reqs.length > 0 && fw.id !== "SCF" && (
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 6 }}>
                          {reqs.map((req) => {
                            const mappedCtls = (REQUIREMENT_CONTROLS[fw.id] || {})[req.ref] || [];
                            return (
                            <div key={req.ref} style={{ background: C.panelHi, borderRadius: 6, padding: "8px 10px", border: `1px solid ${C.line}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                <Mono style={{ fontSize: 10.5, color: C.violet, fontWeight: 600 }}>{req.ref}</Mono>
                                <span style={{ fontSize: 10.5, color: C.inkFaint }}>{req.group}</span>
                              </div>
                              <div style={{ fontSize: 12, color: C.ink, fontWeight: 500 }}>{req.title}</div>
                              <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2, lineHeight: 1.4 }}>{req.intent}</div>
                              {mappedCtls.length > 0 && (
                                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                  <span style={{ fontSize: 10, color: C.inkFaint, alignSelf: "center" }}>Satisfied by</span>
                                  {mappedCtls.map((cid) => <ChipLink key={cid} label={cid} color={C.teal} onClick={() => onNavigate && onNavigate(cid, "CONTROL")} />)}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "industries" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.accent }}>MULTI-INDUSTRY TUNING</Mono>
              <Pill color={C.accent} soft={`${C.accent}1A`}>{INDUSTRIES.length} profiles</Pill>
            </div>
            <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.55 }}>
              The engine adapts to different verticals through industry profiles. Each profile shapes which frameworks apply, how business impact is weighted, and which processes are most critical. Retail/Fuel carries a deep treatment; others are lighter showcases.
            </div>
          </div>
          {INDUSTRIES.filter((ind) => !ql || (ind.label + " " + ind.description + " " + ind.criticalProcesses.map((p) => p.name).join(" ")).toLowerCase().includes(ql)).map((ind) => {
            const isExpanded = expandedDomain === "ind-" + ind.id;
            return (
              <div key={ind.id} style={{ background: C.panel, border: `1px solid ${isExpanded ? C.accent + "66" : C.line}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", transition: "all .15s" }}
                onClick={() => setExpandedDomain(isExpanded ? null : "ind-" + ind.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.panelHi; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.panel; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{ind.label}</span>
                  <span style={{ fontSize: 11, color: C.accent, flexShrink: 0 }}>{isExpanded ? "▾ collapse" : "→ expand"}</span>
                </div>
                <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.5, marginBottom: 10 }}>{ind.description}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {ind.frameworkOverlays.map((fid) => {
                    const fw = FRAMEWORKS[fid];
                    return fw ? <Pill key={fid} color={fw.kind === "regulation" ? C.red : C.violet} soft={`${(fw.kind === "regulation" ? C.red : C.violet)}1A`}>{fw.name}</Pill> : null;
                  })}
                </div>

                {isExpanded && (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                    <Mono style={{ fontSize: 10, color: C.accent, letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>CRITICAL BUSINESS PROCESSES</Mono>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                      {ind.criticalProcesses.map((p) => (
                        <div key={p.name} style={{ background: C.panelHi, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.4 }}>{p.summary}</div>
                        </div>
                      ))}
                    </div>

                    <Mono style={{ fontSize: 10, color: C.violet, letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>FRAMEWORK & REGULATORY OVERLAYS</Mono>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                      {ind.frameworkOverlays.map((fid) => {
                        const fw = FRAMEWORKS[fid];
                        if (!fw) return null;
                        const accent = fw.kind === "regulation" ? C.red : C.violet;
                        return (
                          <span key={fid} onClick={() => onNavigate && onNavigate(fid, "FRAMEWORK")} role="button" tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate && onNavigate(fid, "FRAMEWORK"); } }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${accent}0F`, border: `1px solid ${accent}33`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{fw.name}</span>
                            <Mono style={{ fontSize: 10, color: C.inkFaint }}>{fw.version}</Mono>
                          </span>
                        );
                      })}
                    </div>

                    <Mono style={{ fontSize: 10, color: C.teal, letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>BIA WEIGHTING BIAS</Mono>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {Object.entries(ind.biaBias).map(([dim, rating]) => (
                        <div key={dim} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: C.inkDim, textTransform: "capitalize" }}>{dim}</span>
                          <Pill color={RATING_COLOR[rating]} soft={`${RATING_COLOR[rating]}1A`}><SevIcon level={rating} />{rating}</Pill>
                        </div>
                      ))}
                    </div>

                    <Mono style={{ fontSize: 10, color: C.inkFaint, letterSpacing: "0.06em", marginBottom: 8, display: "block" }}>SAMPLE INITIATIVES</Mono>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {ind.sampleInitiatives.map((s, i) => (
                        <div key={i} style={{ background: C.panelHi, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}`, fontSize: 12.5, color: C.inkDim, lineHeight: 1.45, fontStyle: "italic" }}>"{s}"</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
  const [checkedSteps, setCheckedSteps] = useState(() => {
    try { const v = localStorage.getItem("grc-checklist"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [riskIntakeOpen, setRiskIntakeOpen] = useState(false);
  const resultRef = useRef(null);

  const assessment = useMemo(() => submitted ? buildAssessment(submitted) : null, [submitted]);

  const toggleStep = (key) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem("grc-checklist", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const navigateTo = (id, kind) => {
    if (kind === "RISK") {
      const r = RISKS[id];
      if (r) {
        const mapped = r.controls.map((cid) => CONTROLS[cid]).filter(Boolean);
        setDrawer({ item: { ...r, residual: computeResidual(r.inherent, mapped) }, kind: "RISK" });
      }
    } else if (kind === "CONTROL") {
      const c = CONTROLS[id];
      if (c) setDrawer({ item: { ...c, procedures: CONTROL_PROCEDURES[id] || null }, kind: "CONTROL" });
    } else if (kind === "FRAMEWORK") {
      const fw = FRAMEWORKS[id];
      if (fw) setDrawer({ item: fw, kind: "FRAMEWORK" });
    } else if (kind === "ARCHETYPE") {
      const a = ARCHETYPES.find((x) => x.id === id);
      if (a) setDrawer({ item: a, kind: "ARCHETYPE" });
    }
  };

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
    const provider = (import.meta.env.VITE_AI_PROVIDER || "").toLowerCase();
    const apiKey = import.meta.env.VITE_AI_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;
    const baseUrl = import.meta.env.VITE_AI_BASE_URL;
    const model = import.meta.env.VITE_AI_MODEL;
    if (!apiKey) { setAiState("no-key"); return; }
    setAiState("loading");
    const riskList = assessment.risks.map((r) => r.id + ": " + r.title).join("\n");
    const controlList = assessment.controls.map((c) => c.control.id + ": " + c.control.title + " (" + c.control.type + ")").join("\n");
    const systemMsg = "You are a GRC practitioner reviewing a draft assessment. Identify up to 3 initiative-SPECIFIC considerations the generic baseline would miss. For each, give a one-sentence watch and a one-sentence why. Return ONLY a JSON array, no markdown:\n[{\"watch\":\"...\",\"why\":\"...\"}]";
    const userMsg = "The initiative is:\n\n\"" + submitted + "\"\n\nBaseline risks:\n" + riskList + "\n\nControls mapped:\n" + controlList;
    const isAnthropic = provider === "anthropic" || (!provider && !baseUrl);
    try {
      let text;
      if (isAnthropic) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: model || "claude-sonnet-4-6", max_tokens: 1000, system: systemMsg, messages: [{ role: "user", content: userMsg }] }),
        });
        if (!res.ok) { setAiState("error"); return; }
        const data = await res.json();
        text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      } else {
        const url = (baseUrl || "https://api.openai.com/v1") + "/chat/completions";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({ model: model || "gpt-4o", max_tokens: 1000, messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }] }),
        });
        if (!res.ok) { setAiState("error"); return; }
        const data = await res.json();
        text = (data.choices && data.choices[0] && data.choices[0].message) ? data.choices[0].message.content : "";
      }
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { setAiState("error"); return; }
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) { setAiState("error"); return; }
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
      const scfIds = SCF_MAPPING[c.control.id];
      const scfCell = scfIds ? scfIds.map((sid) => { const s = SCF_CONTROLS[sid]; return s ? "<span title='" + esc(s.title) + "'>" + esc(sid) + "</span>" : esc(sid); }).join(", ") : "<span class='dim'>—</span>";
      controlRows += "<tr><td class='mono'>" + esc(c.control.id) + "</td><td><strong>" + esc(c.control.title) + "</strong> <span class='pill'>" + c.control.type + "</span><br><span class='dim'>" + esc(c.control.statement) + "</span></td><td>" + esc(c.control.owner) + "</td><td class='mono dim'>" + c.addresses.map(esc).join(", ") + "</td><td class='mono'>" + scfCell + "</td></tr>";
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
        const audit = CONTROL_AUDIT[c.control.id];
        let extra = "";
        if (audit) {
          extra = "<div class='small' style='margin-top:7px'><span class='accent'>Auditor will ask:</span><ul style='margin:3px 0 6px'>" + audit.questions.map((q) => "<li>" + esc(q) + "</li>").join("") + "</ul><span class='accent'>Common findings:</span><ul style='margin:3px 0 0'>" + audit.findings.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul></div>";
        }
        testRows += "<tr><td class='mono'>" + esc(c.control.id) + "</td><td>" + esc(c.procedures.testing) + extra + "</td><td class='dim'>" + esc(c.control.evidence) + "</td></tr>";
      }
    });

    const rec = assessment.recommendation;
    const recColor = rec.tone === "red" ? rc.Critical : rec.tone === "amber" ? rc.High : rc.Medium;
    const topRisksList = assessment.topRisks.map((r) => "<li><span class='mono'>" + esc(r.id) + "</span> — " + esc(r.title) + "</li>").join("");
    const topCtlList = assessment.topControls.map((c) => "<li><span class='mono'>" + esc(c.control.id) + "</span> — " + esc(c.control.title) + "</li>").join("");
    const execBlock = "<h2>Executive Recommendation</h2>" +
      "<div class='block' style='border-left-color:" + recColor + "'><strong style='color:" + recColor + "'>" + esc(rec.decision.toUpperCase()) + "</strong> &nbsp;·&nbsp; BIA overall: <span class='tag' style='color:" + rc[assessment.biaOverall] + ";border-color:" + rc[assessment.biaOverall] + "'>" + esc(assessment.biaOverall) + "</span><div class='dim' style='margin-top:6px'>" + esc(rec.rationale) + "</div></div>" +
      "<div style='display:flex;gap:32px;flex-wrap:wrap'><div><div class='mono accent small'>TOP RISKS</div><ul>" + topRisksList + "</ul></div><div><div class='mono accent small'>TOP RECOMMENDATIONS</div><ul>" + topCtlList + "</ul></div></div>";

    const biaRows = assessment.bia.map((d) => "<tr><td><strong>" + esc(d.label) + "</strong></td><td><span class='tag' style='color:" + rc[d.rating] + ";border-color:" + rc[d.rating] + "'>" + esc(d.rating) + "</span></td><td class='dim'>" + esc(d.note) + "</td></tr>").join("");
    const biaBlock = "<h2>Business Impact Analysis</h2><table><thead><tr><th>Dimension</th><th>Impact</th><th>Rationale</th></tr></thead><tbody>" + biaRows + "</tbody></table>";

    const matRows = assessment.maturity.map((m) => "<tr><td><strong>" + esc(m.domain) + "</strong></td><td class='mono'>L" + m.current + " " + esc(MATURITY_LEVELS[m.current - 1].label) + "</td><td class='mono'>L" + m.target + " " + esc(MATURITY_LEVELS[m.target - 1].label) + "</td><td class='dim'>" + esc(m.targetNote) + "</td></tr>").join("");
    const maturityBlock = assessment.maturity.length ? "<h2>Maturity Model</h2><p class='dim small'>Current state is a baseline assumption for a new or un-governed initiative; target is the capability the control set is designed to reach.</p><table><thead><tr><th>Domain</th><th>Current*</th><th>Target</th><th>Target state</th></tr></thead><tbody>" + matRows + "</tbody></table>" : "";

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
      docsBlock = "<h2>Recommended Governance Documents (" + assessment.docCount + ")</h2><p class='dim small'>Recommended document set, not authored content. The writing remains the practitioner's, in the organization's own voice and approval path.</p>" + inner;
    }

    const css = "@media print{@page{margin:18mm}}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a2530;max-width:880px;margin:0 auto;padding:32px 28px;line-height:1.5}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px;border-bottom:2px solid #1a2530;padding-bottom:5px}.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}.dim{color:#5a6b78}.small{font-size:12px}.accent{color:#2557B8;font-weight:600}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}th{text-align:left;background:#f1f4f6;padding:7px 9px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#4a5a66;border-bottom:2px solid #d5dde2}td{padding:8px 9px;border-bottom:1px solid #e3e9ed;vertical-align:top}.tag{display:inline-block;font-family:ui-monospace,monospace;font-size:11px;font-weight:600;padding:2px 8px;border:1px solid;border-radius:4px}.pill{display:inline-block;font-size:10px;padding:1px 6px;background:#eef2f4;border-radius:3px;color:#566573}.block{margin:8px 0;padding:10px 12px;background:#f7f9fa;border-left:3px solid #2557B8;border-radius:4px}.block ol{margin:6px 0 0;padding-left:20px}.block li{margin-bottom:3px}.meta{display:flex;gap:24px;flex-wrap:wrap;margin:14px 0 6px;font-size:13px}.meta b{font-size:20px;font-family:ui-monospace,monospace}.banner{background:#edf3fd;border:1px solid #b9cdf0;border-radius:6px;padding:12px 14px;font-size:12.5px;color:#24406e;margin-top:26px}.head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;border-bottom:3px solid #1a2530;padding-bottom:12px}";

    const archetypeLabels = assessment.archetypes.map((a) => esc(a.label)).join(", ");
    const frameworkList = assessment.frameworks.map((fw) => esc(fw.name) + " " + esc(fw.version)).join(" · ");

    const scopeBlock = assessment.frameworkIds.filter((fid) => assessment.frameworkScope[fid]).map((fid) => {
      const fw = FRAMEWORKS[fid];
      const scope = assessment.frameworkScope[fid];
      const cat = FRAMEWORK_REQUIREMENTS[fid] || [];
      const idx = (r) => { const i = cat.findIndex((x) => x.ref === r); return i === -1 ? 999 : i; };
      const highlighted = fid === "SOX-ITGC" || fid === "PCI-DSS";
      const rows = Object.keys(scope).sort((a, b) => idx(a) - idx(b)).map((ref) => {
        const reqMeta = cat.find((r) => r.ref === ref);
        return "<tr><td class='mono'>" + esc(ref) + "</td><td>" + (reqMeta ? "<strong>" + esc(reqMeta.title) + "</strong><br><span class='dim'>" + esc(reqMeta.intent) + "</span>" : "") + "</td><td class='mono'>" + scope[ref].controlIds.map(esc).join(", ") + "</td></tr>";
      }).join("");
      return "<h3>" + esc(fw.name) + " <span class='pill'>" + esc(fw.version) + "</span>" + (highlighted ? " <span class='tag' style='color:#2557B8;border-color:#2557B8'>Highlighted</span>" : "") + "</h3><table><thead><tr><th>Requirement</th><th>Objective</th><th>Controls</th></tr></thead><tbody>" + rows + "</tbody></table>";
    }).join("");
    const frameworkScopeBlock = scopeBlock ? "<h2>Framework Scope &amp; Control Crosswalk</h2><p class='dim small'>Requirement-level mapping to the controls that satisfy them. SOX ITGC and PCI DSS 4.0.1 highlighted.</p>" + scopeBlock : "";

    const fwRefRows = assessment.frameworks.map((fw) => "<tr><td><strong>" + esc(fw.name) + "</strong></td><td class='mono'>" + esc(fw.version) + "</td><td>" + esc(fw.publisher) + "</td><td class='dim'>" + esc(fw.date || "") + "</td></tr>").join("");
    const fwRefBlock = "<h2>Framework Reference</h2><table><thead><tr><th>Framework</th><th>Version</th><th>Publisher</th><th>Date</th></tr></thead><tbody>" + fwRefRows + "</tbody></table>";

    const html = "<!doctype html><html><head><meta charset='utf-8'><title>GRC Assessment Summary</title><style>" + css + "</style></head><body>" +
      "<div class='head'><div><h1>Governance Assessment</h1><div class='dim small'>Executive Summary - Generated " + esc(date) + "</div></div><div class='mono dim'>Knowledge Library v" + esc(LIBRARY_VERSION) + "</div></div>" +
      "<h2>Initiative</h2><p>" + esc(submitted) + "</p><p class='small dim'>Classified as: " + archetypeLabels + "</p>" +
      "<div class='meta'><div><b>" + assessment.risks.length + "</b><br><span class='dim small'>Risks</span></div><div><b>" + assessment.controls.length + "</b><br><span class='dim small'>Controls</span></div><div><b>" + assessment.inherentHC + "</b><br><span class='dim small'>High/Critical inherent</span></div><div><b>" + assessment.residualHC + "</b><br><span class='dim small'>High/Critical residual*</span></div></div>" +
      execBlock +
      biaBlock +
      "<h2>Risk Register</h2><table><thead><tr><th>ID</th><th>Risk</th><th>Inherent</th><th>Residual*</th></tr></thead><tbody>" + riskRows + "</tbody></table>" +
      "<h2>Control Matrix</h2><table><thead><tr><th>ID</th><th>Control</th><th>Owner</th><th>Addresses</th><th>SCF " + esc(SCF_VERSION) + "</th></tr></thead><tbody>" + controlRows + "</tbody></table>" +
      "<h2>Implementation Checklist</h2>" + checklist +
      "<h2>Audit Readiness</h2><table><thead><tr><th>Control</th><th>Test Procedure · Auditor Questions · Common Findings</th><th>Evidence</th></tr></thead><tbody>" + testRows + "</tbody></table>" +
      "<h2>Frameworks Implicated</h2><p>" + frameworkList + "</p>" +
      frameworkScopeBlock +
      fwRefBlock +
      (assessment.convergence.length > 0 ? "<h2>Convergence Pathways (" + assessment.convergence.length + ")</h2><p class='dim small'>Where GRC-owned spine failures cascade into domains owned by other functions. GRC prevents or detects the spine failure; the downstream domain owns the converged risk.</p><table><thead><tr><th>ID</th><th>Spine Failure</th><th>Cascade</th><th>Impact Domain</th></tr></thead><tbody>" + assessment.convergence.map((c) => "<tr><td class='mono'>" + esc(c.id) + "</td><td><strong>" + esc(c.spineLabel) + "</strong> <span class='mono dim'>(" + esc(c.spineRisk) + ")</span><br><span class='dim'>" + esc(c.impact) + "</span></td><td class='dim'>" + c.chain.map(esc).join(" → ") + "</td><td><span class='tag' style='color:#C0392B;border-color:#C0392B'>" + esc(c.impactDomain) + "</span></td></tr>").join("") + "</tbody></table>" : "") +
      maturityBlock + docsBlock + aiBlock +
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
    setTimeout(() => setExported(false), 3500);
  };

  // Running section number — keeps numbering contiguous across conditional sections.
  // Single source of truth for which sections render, in order — drives both the
  // section numbering and the sticky jump-nav (Gap 3), so they can never drift.
  const scopedCount = assessment ? assessment.frameworkIds.filter((fid) => assessment.frameworkScope[fid]).length : 0;
  const navSections = assessment ? [
    { id: "exec", title: "Executive Recommendation" },
    { id: "bia", title: "Business Impact Analysis" },
    { id: "risks", title: "Risk Register" },
    { id: "controls", title: "Control Matrix" },
    { id: "checklist", title: "Implementation Checklist" },
    { id: "audit", title: "Audit Readiness" },
    { id: "frameworks", title: "Frameworks Implicated" },
    ...(scopedCount > 0 ? [{ id: "scope", title: "Framework Scope & Crosswalk" }] : []),
    ...(assessment.convergence.length > 0 ? [{ id: "convergence", title: "Convergence Pathways" }] : []),
    ...(assessment.maturity.length > 0 ? [{ id: "maturity", title: "Maturity Model" }] : []),
    { id: "docs", title: "Governance Documents" },
    { id: "ai", title: "Initiative-Specific Review" },
  ] : [];
  const secNumOf = (id) => String(Math.max(0, navSections.findIndex((s) => s.id === id)) + 1).padStart(2, "0");
  const SCROLL_MT = 118;

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif", backgroundImage: `radial-gradient(1200px 620px at 15% -6%, ${C.accent}1F 0%, ${C.canvas} 55%)` }}>
      <SourceDrawer item={drawer ? drawer.item : null} kind={drawer ? drawer.kind : null} onClose={() => setDrawer(null)} onNavigate={navigateTo} />

      <header style={{ borderBottom: `1px solid ${C.line}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: `${C.canvas}E8`, backdropFilter: "blur(10px)", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <BrandMark size={26} />
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>GRC Intelligence Engine</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "inline-flex", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ id: "engine", label: "Engine" }, { id: "library", label: "Library" }].map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                background: view === v.id ? C.panelHi : "transparent",
                color: view === v.id ? C.ink : C.inkDim,
                border: view === v.id ? `1px solid ${C.line}` : "1px solid transparent",
                borderRadius: 6, padding: "5px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
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
          <Mono style={{ fontSize: 12, letterSpacing: "0.1em", color: C.accent }}>INITIATIVE TO GOVERNANCE PACKAGE</Mono>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.025em", margin: "16px 0 14px", maxWidth: 760 }}>
            Describe what you're building. Get an auditor-ready risk, control, and evidence package.
          </h1>
          <p style={{ color: C.inkDim, fontSize: 16, lineHeight: 1.55, maxWidth: 620, margin: 0 }}>
            Backed by a curated control library where every risk and control traces to an inspectable source. Built to accelerate a practitioner's judgment, not replace it.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 12.5, color: C.inkFaint }}>
            <span>{Object.keys(FRAMEWORKS).length} frameworks</span>
            <span style={{ color: C.line }}>·</span>
            <span>{SCF_DOMAINS.reduce((s, d) => s + d.count, 0).toLocaleString()} SCF controls</span>
            <span style={{ color: C.line }}>·</span>
            <span>{Object.keys(RISKS).length} risks · {Object.keys(CONTROLS).length} controls</span>
            <span style={{ color: C.line }}>·</span>
            <span>Runs in-browser</span>
          </div>
          <div style={{ marginTop: 30, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
            <textarea aria-label="Describe the technology initiative to assess" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} placeholder="e.g. We are implementing a new third-party SaaS platform that stores customer payment information and integrates with our ERP…" rows={3} style={{ width: "100%", background: "transparent", border: "none", outlineOffset: 4, resize: "vertical", color: C.ink, fontSize: 15.5, lineHeight: 1.55, fontFamily: "'Space Grotesk', sans-serif", minHeight: 70 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {SAMPLES.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); run(s); }} style={{ background: C.panelHi, border: `1px solid ${C.line}`, color: C.inkDim, borderRadius: 7, padding: "6px 11px", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.length > 42 ? s.slice(0, 42) + "…" : s}
                  </button>
                ))}
              </div>
              <button onClick={() => run()} disabled={!input.trim()} style={{ background: input.trim() ? `linear-gradient(135deg, ${C.accent}, #2E6BE0)` : C.panelHi, color: input.trim() ? "#F5FAFF" : C.inkFaint, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: input.trim() ? "pointer" : "default", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>
                Generate package →
              </button>
            </div>
          </div>
        </section>

        {!submitted && <HowItWorks onExploreLibrary={() => setView("library")} />}

        <div ref={resultRef}>
          {submitted && !assessment && (
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 28, marginTop: 16, textAlign: "center" }}>
              <p style={{ color: C.inkDim, margin: "0 0 16px", lineHeight: 1.6 }}>The engine couldn't match this to a known system pattern yet. Try naming the system type, the data it handles, or a vendor. Here are some examples:</p>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
                {SAMPLES.slice(0, 4).map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); run(s); }} style={{ background: C.panelHi, border: `1px solid ${C.line}`, color: C.inkDim, borderRadius: 7, padding: "6px 11px", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.length > 50 ? s.slice(0, 50) + "…" : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {assessment && (
            <section style={{ marginTop: 16 }}>
              <div style={{ background: C.accentSoft, border: `1px solid ${C.accent}40`, borderRadius: 12, padding: "16px 18px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Mono style={{ fontSize: 11, letterSpacing: "0.08em", color: C.accent }}>CLASSIFIED AS</Mono>
                    {assessment.archetypes.map((a) => <Pill key={a.id} color={C.accent} soft={`${C.accent}1A`}>{a.label}</Pill>)}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: C.inkDim, lineHeight: 1.5 }}>
                    Matched on {assessment.archetypes.flatMap((a) => a.matched).slice(0, 6).map((m, i) => <Mono key={i} style={{ color: C.ink, marginRight: 8 }}>{m}</Mono>)}
                  </div>
                </div>
                <button onClick={downloadSummary} aria-live="polite" style={{ background: exported ? `${C.teal}1F` : C.canvas, border: `1px solid ${exported ? C.teal : C.accent}66`, color: exported ? C.teal : C.accent, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap", transition: "all .15s" }}>
                  {exported ? "Downloaded ✓" : "↓ Export summary"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }} className="grid2">
                <StatCard n={assessment.risks.length} label="Risks identified" color={C.accent} />
                <StatCard n={assessment.controls.length} label="Controls recommended" color={C.teal} />
                <StatCard n={assessment.inherentHC} label="High / Critical (inherent)" color={C.red} />
                <StatCard n={assessment.residualHC} label="High / Critical (residual*)" color={assessment.residualHC < assessment.inherentHC ? C.teal : C.red} />
              </div>
              {assessment.residualHC < assessment.inherentHC && (
                <div style={{ marginBottom: 28, fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}>
                  <Mono style={{ color: C.teal }}>{"↓ " + (assessment.inherentHC - assessment.residualHC)}</Mono> fewer high/critical risks once the recommended controls are in place. <span style={{ color: C.inkFaint }}>*Target residual, not earned until the controls exist.</span>
                </div>
              )}

              <div style={{ background: `${C.teal}0F`, border: `1px solid ${C.teal}40`, borderRadius: 12, padding: "13px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.5, flex: 1, minWidth: 260 }}>
                  <span style={{ color: C.teal, fontWeight: 600 }}>This package is fully inspectable.</span> Click any <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.ink, border: `1px solid ${C.teal}44`, background: `${C.teal}10`, borderRadius: 4, padding: "1px 5px" }}>ID&#8202;↗</span> (risk, control, or framework) to open its sourced entry. Assembled from a curated library of {Object.keys(RISKS).length} risks · {Object.keys(CONTROLS).length} controls · {Object.keys(FRAMEWORKS).length} frameworks.
                </div>
                <button onClick={() => setView("library")} style={{ background: C.canvas, border: `1px solid ${C.teal}66`, color: C.teal, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>Explore Library →</button>
              </div>

              <Legend />

              <SectionNav sections={navSections} />

              <div id="sec-exec" style={{ marginBottom: 28, scrollMarginTop: SCROLL_MT }}>
                <SectionLabel n={secNumOf("exec")} title="Executive Recommendation" hint="Go / No-Go from the target residual posture" />
                {(() => {
                  const tone = assessment.recommendation.tone === "red" ? C.red : assessment.recommendation.tone === "amber" ? C.orange : C.teal;
                  return (
                    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${tone}`, borderRadius: 12, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: tone, background: `${tone}1A`, border: `1px solid ${tone}55`, borderRadius: 6, padding: "6px 12px" }}>{assessment.recommendation.decision.toUpperCase()}</span>
                        <span style={{ fontSize: 13, color: C.inkDim, display: "inline-flex", alignItems: "center", gap: 7 }}>BIA overall <Pill color={RATING_COLOR[assessment.biaOverall]} soft={`${RATING_COLOR[assessment.biaOverall]}1A`}>{assessment.biaOverall}</Pill></span>
                      </div>
                      <div style={{ fontSize: 13.5, color: C.inkDim, lineHeight: 1.55, marginBottom: 16 }}>{assessment.recommendation.rationale}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="grid2">
                        <div>
                          <Mono style={{ fontSize: 10, color: C.inkFaint, letterSpacing: "0.08em" }}>TOP RISKS</Mono>
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                            {assessment.topRisks.map((r) => (
                              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <ChipLink label={r.id} color={RATING_COLOR[r.inherent]} onClick={() => navigateTo(r.id, "RISK")} />
                                <span style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.4 }}>{r.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Mono style={{ fontSize: 10, color: C.inkFaint, letterSpacing: "0.08em" }}>TOP RECOMMENDATIONS</Mono>
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                            {assessment.topControls.map((c) => (
                              <div key={c.control.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <ChipLink label={c.control.id} color={C.teal} onClick={() => navigateTo(c.control.id, "CONTROL")} />
                                <span style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.4 }}>{c.control.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div id="sec-bia" style={{ marginBottom: 28, scrollMarginTop: SCROLL_MT }}>
                <SectionLabel n={secNumOf("bia")} title="Business Impact Analysis" hint={"Worst-case impact across six dimensions · overall " + assessment.biaOverall} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {assessment.bia.map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 15px", flexWrap: "wrap" }}>
                      <div style={{ width: 104, flexShrink: 0, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{d.label}</div>
                      <div style={{ width: 86, flexShrink: 0 }}><Pill color={RATING_COLOR[d.rating]} soft={`${RATING_COLOR[d.rating]}1A`}><SevIcon level={d.rating} />{d.rating}</Pill></div>
                      <div style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: C.inkDim, lineHeight: 1.45 }}>{d.note}</div>
                    </div>
                  ))}
                </div>
                <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 10, display: "block" }}>Worst case across the matched system patterns. Each dimension is rated independently; the overall is the highest.</Mono>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="grid2">
                <div id="sec-risks" style={{ scrollMarginTop: SCROLL_MT }}>
                  <SectionLabel n={secNumOf("risks")} title="Risk Register" hint="Inherent and target residual" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assessment.risks.map((r) => (
                      <Card key={r.id} onClick={() => setDrawer({ item: r, kind: "RISK" })}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <Mono style={{ fontSize: 11, color: C.inkFaint, fontVariantNumeric: "tabular-nums" }}>{r.id}</Mono>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Pill color={RATING_COLOR[r.inherent]} soft={`${RATING_COLOR[r.inherent]}1A`}><SevIcon level={r.inherent} />{r.inherent}</Pill>
                            <span aria-hidden="true" style={{ color: C.inkFaint, fontSize: 12 }}>{"→"}</span>
                            <Pill color={RATING_COLOR[r.residual.residual]} soft={`${RATING_COLOR[r.residual.residual]}1A`}><SevIcon level={r.residual.residual} />{r.residual.residual}</Pill>
                          </div>
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{r.title}</div>
                        <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.statement}</div>
                        <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <Mono style={{ fontSize: 10.5, color: C.inkFaint, fontVariantNumeric: "tabular-nums" }}>{r.domain + " · " + r.controls.length + " controls · " + (r.residual.levels > 0 ? "↓ " + r.residual.levels + " level" + (r.residual.levels > 1 ? "s" : "") : "no reduction")}</Mono>
                          <span className="drill-affordance" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.inkDim, whiteSpace: "nowrap", flexShrink: 0 }}>Inspect<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><path d="M9 18l6-6-6-6" /></svg></span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div id="sec-controls" style={{ scrollMarginTop: SCROLL_MT }}>
                  <SectionLabel n={secNumOf("controls")} title="Control Matrix" hint="Mapped to the risks they address" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assessment.controls.map((c) => (
                      <Card key={c.control.id} onClick={() => setDrawer({ item: { ...c.control, procedures: c.procedures }, kind: "CONTROL" })}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <Mono style={{ fontSize: 11, color: C.inkFaint }}>{c.control.id}</Mono>
                          <Pill color={TYPE_COLOR[c.control.type]} soft={`${TYPE_COLOR[c.control.type]}1A`}>{c.control.type}</Pill>
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, margin: "7px 0 5px", lineHeight: 1.35 }}>{c.control.title}</div>
                        <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5 }}>{c.control.statement}</div>
                        <div style={{ marginTop: 9, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                          <Mono style={{ fontSize: 10, color: C.inkFaint }}>ADDRESSES</Mono>
                          {c.addresses.map((a) => <ChipLink key={a} label={a} onClick={() => navigateTo(a, "RISK")} />)}
                        </div>
                        {SCF_MAPPING[c.control.id] && (
                          <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                            <Mono style={{ fontSize: 10, color: C.inkFaint }}>SCF</Mono>
                            {SCF_MAPPING[c.control.id].map((sid) => <Mono key={sid} style={{ fontSize: 10, color: C.accent }}>{sid}</Mono>)}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div id="sec-checklist" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                {(() => {
                  const implControls = assessment.controls.filter((c) => c.procedures && c.procedures.implementation);
                  const totalSteps = implControls.reduce((n, c) => n + c.procedures.implementation.length, 0);
                  const doneSteps = implControls.reduce((n, c) => n + c.procedures.implementation.filter((_, i) => checkedSteps.has(c.control.id + ":" + i)).length, 0);
                  return (<>
                <SectionLabel n={secNumOf("checklist")} title="Implementation Checklist" hint={"Steps to stand up each recommended control · " + doneSteps + " / " + totalSteps + " complete"} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {implControls.map((c) => {
                    const steps = c.procedures.implementation;
                    const done = steps.filter((_, i) => checkedSteps.has(c.control.id + ":" + i)).length;
                    return (
                    <div key={c.control.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9, flexWrap: "wrap" }}>
                        <ChipLink label={c.control.id} onClick={() => navigateTo(c.control.id, "CONTROL")} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{c.control.title}</span>
                        <Pill color={TYPE_COLOR[c.control.type]} soft={`${TYPE_COLOR[c.control.type]}1A`}>{c.control.type}</Pill>
                        <Mono style={{ fontSize: 10.5, color: done === steps.length ? C.teal : C.inkFaint, marginLeft: "auto" }}>{done} / {steps.length}</Mono>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {steps.map((step, i) => {
                          const key = c.control.id + ":" + i;
                          const on = checkedSteps.has(key);
                          return (
                          <div key={i} role="button" tabIndex={0} onClick={() => toggleStep(key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleStep(key); } }} style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? C.teal : C.inkFaint}`, background: on ? `${C.teal}1A` : "transparent", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }}>
                              {on && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2.5 6 L5 8.5 L9.5 3.5" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                            </span>
                            <span style={{ fontSize: 13, color: on ? C.inkFaint : C.inkDim, lineHeight: 1.45, textDecorationLine: on ? "line-through" : "none", textDecorationColor: `${C.inkFaint}66` }}>{step}</span>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
                <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 10, display: "block" }}>Toggle steps as you complete them. Progress is saved in your browser.</Mono>
                  </>);
                })()}
              </div>

              <div id="sec-audit" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                <SectionLabel n={secNumOf("audit")} title="Audit Readiness" hint="Test procedure, the questions an auditor will ask, and the findings that surface when it's weak" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {assessment.controls.filter((c) => c.procedures && c.procedures.testing).map((c) => {
                    const audit = CONTROL_AUDIT[c.control.id];
                    return (
                    <div key={c.control.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "13px 15px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 7, flexWrap: "wrap" }}>
                        <ChipLink label={c.control.id} color={C.violet} onClick={() => navigateTo(c.control.id, "CONTROL")} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c.control.title}</span>
                      </div>
                      <div style={{ display: "flex", gap: 9, alignItems: "baseline" }}>
                        <Mono style={{ fontSize: 9.5, color: C.inkFaint, letterSpacing: "0.06em", flexShrink: 0, width: 40 }}>TEST</Mono>
                        <div style={{ fontSize: 13, color: C.inkDim, lineHeight: 1.5 }}>{c.procedures.testing}</div>
                      </div>
                      {audit && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid2">
                          <div>
                            <Mono style={{ fontSize: 9.5, color: C.violet, letterSpacing: "0.06em" }}>AUDITOR WILL ASK</Mono>
                            <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                              {audit.questions.map((q, i) => <li key={i} style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45, marginBottom: 3 }}>{q}</li>)}
                            </ul>
                          </div>
                          <div>
                            <Mono style={{ fontSize: 9.5, color: C.accent, letterSpacing: "0.06em" }}>COMMON FINDINGS</Mono>
                            <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                              {audit.findings.map((f, i) => <li key={i} style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45, marginBottom: 3 }}>{f}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              <div id="sec-frameworks" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                <SectionLabel n={secNumOf("frameworks")} title="Frameworks Implicated" hint={"Where this initiative creates obligations · " + assessment.frameworks.length + " in scope"} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {assessment.frameworks.map((fw) => (
                    <ChipLink key={fw.id} label={fw.name + " " + fw.version} color={fw.kind === "regulation" ? C.red : C.violet} onClick={() => navigateTo(fw.id, "FRAMEWORK")} />
                  ))}
                </div>
              </div>

              {assessment.frameworkIds.filter((fid) => assessment.frameworkScope[fid]).length > 0 && (() => {
                const scopedIds = assessment.frameworkIds.filter((fid) => assessment.frameworkScope[fid]);
                const totalReqs = scopedIds.reduce((n, fid) => n + Object.keys(assessment.frameworkScope[fid]).length, 0);
                return (
                <div id="sec-scope" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                  <SectionLabel n={secNumOf("scope")} title="Framework Scope & Control Crosswalk" hint={"Requirement-level mapping to the controls that satisfy them · SOX ITGC and PCI DSS 4.0.1 highlighted · " + totalReqs + " requirements across " + scopedIds.length + " frameworks"} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid2">
                    {scopedIds.map((fid) => {
                      const fw = FRAMEWORKS[fid];
                      const highlighted = fid === "SOX-ITGC" || fid === "PCI-DSS";
                      const accent = fw.kind === "regulation" ? C.red : C.violet;
                      const scope = assessment.frameworkScope[fid];
                      const cat = FRAMEWORK_REQUIREMENTS[fid] || [];
                      const idx = (r) => { const i = cat.findIndex((x) => x.ref === r); return i === -1 ? 999 : i; };
                      const reqs = Object.keys(scope).sort((a, b) => idx(a) - idx(b));
                      return (
                        <div key={fid} style={{ background: C.panel, border: `1px solid ${highlighted ? C.accent + "66" : C.line}`, borderRadius: 12, padding: "18px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{fw.name}</span>
                            <Pill color={accent} soft={`${accent}1A`}>{fw.version}</Pill>
                            {highlighted && <Pill color={C.accent} soft={`${C.accent}1A`}>Highlighted</Pill>}
                            <Mono style={{ fontSize: 10, color: C.inkFaint, marginLeft: "auto" }}>{reqs.length + " req" + (reqs.length === 1 ? "" : "s")}</Mono>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {reqs.map((ref) => {
                              const reqMeta = cat.find((r) => r.ref === ref);
                              const entry = scope[ref];
                              return (
                                <div key={ref} style={{ background: C.panelHi, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <Mono style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{ref}</Mono>
                                    {reqMeta && <span style={{ fontSize: 11, color: C.inkFaint }}>{reqMeta.group}</span>}
                                  </div>
                                  {reqMeta && <div style={{ fontSize: 12, color: C.ink, fontWeight: 500, marginBottom: 4 }}>{reqMeta.title}</div>}
                                  {reqMeta && <div style={{ fontSize: 11, color: C.inkDim, lineHeight: 1.4, marginBottom: 8 }}>{reqMeta.intent}</div>}
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                    {entry.controlIds.map((cid) => <ChipLink key={cid} label={cid} color={C.teal} onClick={() => navigateTo(cid, "CONTROL")} />)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {assessment.convergence.length > 0 && (
                <div id="sec-convergence" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                  <SectionLabel n={secNumOf("convergence")} title="Convergence Pathways" hint={"Where spine failures cascade beyond GRC-owned domains · " + assessment.convergence.length + " pathway" + (assessment.convergence.length === 1 ? "" : "s") + " identified"} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid2">
                    {assessment.convergence.map((c) => (
                      <div key={c.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 18px", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                          <Mono style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{c.id}</Mono>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, flex: 1 }}>{c.spineLabel}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <CascadeFlow
                            chain={c.chain}
                            spineRisk={c.spineRisk}
                            impactDomain={c.impactDomain}
                            onRiskClick={() => { const r = assessment.risks.find((r) => r.id === c.spineRisk); if (r) setDrawer({ item: r, kind: "RISK" }); }}
                          />
                        </div>
                        <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.5, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>{c.impact}</div>
                      </div>
                    ))}
                  </div>
                  <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 14, display: "block", lineHeight: 1.55 }}>
                    Convergence pathways show where GRC-owned spine failures cascade into domains owned by other functions. GRC prevents or detects the spine failure; the downstream domain owns the converged risk.
                  </Mono>
                </div>
              )}

              {assessment.maturity.length > 0 && (
                <div id="sec-maturity" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                  <SectionLabel n={secNumOf("maturity")} title="Maturity Model" hint="Current baseline → target capability per in-scope domain" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {assessment.maturity.map((m) => (
                      <div key={m.domain} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{m.domain}</span>
                          <Mono style={{ fontSize: 11 }}>
                            <span style={{ color: C.inkDim }}>L{m.current} {MATURITY_LEVELS[m.current - 1].label}</span>
                            <span style={{ margin: "0 6px", color: C.inkFaint }}>→</span>
                            <span style={{ color: C.teal }}>L{m.target} {MATURITY_LEVELS[m.target - 1].label}</span>
                          </Mono>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                          {MATURITY_LEVELS.map((lvl) => {
                            const isCurrent = lvl.level <= m.current;
                            const inRange = lvl.level > m.current && lvl.level <= m.target;
                            const bg = isCurrent ? C.inkFaint : inRange ? C.teal : C.line;
                            return (
                              <div key={lvl.level} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                                <div style={{ width: "100%", height: 6, borderRadius: 3, background: bg, opacity: (isCurrent || inRange) ? 1 : 0.5 }} />
                                <Mono style={{ fontSize: 9, color: (isCurrent || inRange) ? C.inkDim : C.inkFaint }}>{lvl.label}</Mono>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid2">
                          <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45 }}><Mono style={{ fontSize: 9.5, color: C.inkFaint, letterSpacing: "0.06em", display: "block", marginBottom: 3 }}>CURRENT (ASSUMED)</Mono>{m.currentNote}</div>
                          <div style={{ fontSize: 12, color: C.inkDim, lineHeight: 1.45 }}><Mono style={{ fontSize: 9.5, color: C.teal, letterSpacing: "0.06em", display: "block", marginBottom: 3 }}>TARGET</Mono>{m.targetNote}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 10, display: "block", lineHeight: 1.55 }}>
                    Current state is a baseline assumption for a new or un-governed initiative, the starting point before the recommended controls exist. Target is the capability the control set is designed to reach.
                  </Mono>
                </div>
              )}

              <div id="sec-docs" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                <SectionLabel n={secNumOf("docs")} title="Recommended Governance Documents" hint={"Policy, standard, and procedure scaffolding the controls live under · " + assessment.docCount + " documents across " + assessment.docsByTier.filter((t) => t.docs.length).length + " tier" + (assessment.docsByTier.filter((t) => t.docs.length).length === 1 ? "" : "s")} />
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {assessment.docsByTier.filter((t) => t.docs.length > 0).map((t) => (
                    <div key={t.id}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 9, flexWrap: "wrap" }}>
                        <Mono style={{ fontSize: 11, color: C.accent, fontWeight: 600, letterSpacing: "0.05em" }}>{t.label.toUpperCase()}</Mono>
                        <span style={{ fontSize: 12, color: C.inkFaint, fontStyle: "italic" }}>{t.blurb}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="grid2">
                        {t.docs.map((d) => (
                          <div key={d.name} style={{ background: C.panel, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: "13px 15px" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.35, marginBottom: 6 }}>{d.name}</div>
                            <div style={{ fontSize: 12.5, color: C.inkDim, lineHeight: 1.5, marginBottom: 9 }}>{d.purpose}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                              <Mono style={{ fontSize: 10, color: C.inkFaint }}>BACKS</Mono>
                              {d.controls.map((cid) => <ChipLink key={cid} label={cid} onClick={() => navigateTo(cid, "CONTROL")} />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Mono style={{ fontSize: 11, color: C.inkFaint, marginTop: 12, display: "block", lineHeight: 1.55 }}>
                  Recommended document set, not authored content. Each document is the scaffolding required to govern the controls listed. The writing remains the practitioner's, with the organization's own voice, governance hierarchy, and approval path.
                </Mono>
              </div>

              <div id="sec-ai" style={{ marginTop: 28, scrollMarginTop: SCROLL_MT }}>
                <SectionLabel n={secNumOf("ai")} title="Initiative-Specific Review" hint="AI layer that adds nuance the baseline library cannot" />
                {aiState === "idle" && (
                  <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 12, padding: 22, textAlign: "center" }}>
                    <p style={{ color: C.inkDim, fontSize: 13.5, lineHeight: 1.55, margin: "0 auto 14px", maxWidth: 520 }}>The matrix above is the curated baseline. This step asks the AI layer to surface considerations specific to your exact initiative that a generic library would miss.</p>
                    <button onClick={deepenWithAI} style={{ background: `${C.violet}1F`, border: `1px solid ${C.violet}55`, color: C.violet, borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>Deepen with AI →</button>
                  </div>
                )}
                {aiState === "no-key" && (
                  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22, textAlign: "center" }}>
                    <p style={{ color: C.inkDim, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>The AI layer requires an API key. Copy <Mono style={{ color: C.ink }}>.env.example</Mono> to <Mono style={{ color: C.ink }}>.env</Mono>, set your provider and API key, then restart the dev server. The curated baseline above stands on its own; this feature is additive.</p>
                  </div>
                )}
                {aiState === "loading" && (
                  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22, color: C.inkDim, fontSize: 13.5 }}><Mono style={{ color: C.violet }}>Analyzing initiative-specific exposure…</Mono></div>
                )}
                {aiState === "error" && (
                  <div style={{ background: C.redSoft, border: `1px solid ${C.red}40`, borderRadius: 12, padding: 18, color: C.inkDim, fontSize: 13.5 }}>The AI layer could not be reached. The curated baseline above stands on its own. That is the point of grounding the product in a real library rather than the model alone.</div>
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
                  <div style={{ width: 4, alignSelf: "stretch", background: C.accent, borderRadius: 99, flexShrink: 0 }} />
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
              <Why title="The moat is the library, not the model" body="Anyone can wrap an LLM. The defensible asset is the curated risk-control-framework-evidence graph: versioned, editor-owned, improving with every assessment." />
              <Why title="Every line is inspectable" body="Click any risk or control to see its source entry: statement, owner, frequency, and the evidence an auditor expects. Unsourced output has no place in GRC." />
              <Why title="Assistive by design" body="Positioned as acceleration of a practitioner's judgment, never a replacement. That framing is both honest and the thing that keeps the product legally viable." />
            </div>
          </section>
        )}
        </>
        ) : (
          <LibraryBrowser onOpen={setDrawer} onNavigate={navigateTo} />
        )}
      </main>
      <footer style={{ borderTop: `1px solid ${C.line}`, marginTop: 60, padding: "28px 24px 32px", color: C.inkFaint, fontSize: 12, lineHeight: 1.55 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            Built by <Mono style={{ color: C.ink }}>@dansong002</Mono> · <span style={{ color: C.inkDim }}>GRC Practitioner</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://github.com/dansong002/grc-intelligence-engine" target="_blank" rel="noopener noreferrer" style={{ color: C.inkDim, textDecoration: "none", borderBottom: `1px dashed ${C.inkFaint}55` }}>View source on GitHub ↗</a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
