/* ===== INLINED KNOWLEDGE LIBRARY ===== */
export const LIBRARY_VERSION = "0.2.0";
export const LIBRARY_UPDATED = "2026-06";

/* ---------------------------------------------------------------------------
 * RESIDUAL RISK MODEL
 * Deterministic, inspectable residual scoring. An inherent rating is stepped
 * down by the controls mapped to the risk, weighted by control type — grounded
 * in the GRC principle that preventive beats detective beats corrective in
 * actual risk reduction.
 *
 * IMPORTANT FRAMING: the residual produced here is the TARGET residual assuming
 * the recommended controls are implemented and operating effectively. It is not
 * a current-state residual. You cannot claim reduction for controls you have not
 * yet built — the UI labels it accordingly.
 *
 * The weights and POINTS_PER_LEVEL are the tuning knobs. They live here as data,
 * not buried in logic, so a practitioner can recalibrate to their own risk
 * appetite without touching the engine.
 * ------------------------------------------------------------------------- */
export const RATING_SCALE = ["Low", "Medium", "High", "Critical"];
export const RATING_VALUE = { Low: 1, Medium: 2, High: 3, Critical: 4 };
export const VALUE_RATING = { 1: "Low", 2: "Medium", 3: "High", 4: "Critical" };

// Reduction points each control contributes, by control type.
export const CONTROL_REDUCTION = { Preventive: 1.0, Detective: 0.6, Corrective: 0.4 };

// Reduction points required to step a rating down one full level.
export const POINTS_PER_LEVEL = 2.0;

/* Pure function. Given an inherent rating string and the list of mapped control
 * objects, returns the residual rating plus the full reasoning so the number is
 * auditable rather than mysterious.
 *   -> { residual, inherentValue, residualValue, points, levels, breakdown } */
export function computeResidual(inherent, controls) {
  const inherentValue = RATING_VALUE[inherent] || 1;
  const breakdown = { Preventive: 0, Detective: 0, Corrective: 0 };
  let points = 0;
  (controls || []).forEach((c) => {
    const t = c && c.type;
    if (t && CONTROL_REDUCTION[t] != null) {
      breakdown[t] += 1;
      points += CONTROL_REDUCTION[t];
    }
  });
  // Levels reduced, rounded to nearest. Capped so residual never drops below
  // Low (value 1) — there is always some residual risk.
  const rawLevels = points / POINTS_PER_LEVEL;
  const levels = Math.max(0, Math.min(Math.round(rawLevels), inherentValue - 1));
  const residualValue = Math.max(1, inherentValue - levels);
  return {
    residual: VALUE_RATING[residualValue],
    inherentValue,
    residualValue,
    points: Math.round(points * 10) / 10,
    levels,
    breakdown,
  };
}

/* ---------------------------------------------------------------------------
 * SYSTEM ARCHETYPES
 * The engine classifies a free-text initiative into one or more archetypes.
 * Each archetype activates a curated set of risks. This is deterministic and
 * inspectable — not the LLM guessing from scratch.
 * ------------------------------------------------------------------------- */
export const ARCHETYPES = [
  {
    id: "saas-financial",
    label: "SaaS — Financial / ERP System",
    hint: "Hosted application that processes, stores, or reports financial data",
    signals: ["erp", "financial", "workday", "netsuite", "oracle", "sap", "payroll", "general ledger", "servicenow", "billing", "revenue"],
    risks: ["RSK-TEC-CHG-001", "RSK-CYB-IDM-001", "RSK-CYB-IDM-002", "RSK-TPR-SUP-001", "RSK-DSP-RET-001", "RSK-CMP-SOX-001", "RSK-TEC-AVL-001"],
  },
  {
    id: "payments",
    label: "Payments / Cardholder Data System",
    hint: "Anything that touches storage, processing, or transmission of card data",
    signals: ["payment", "card", "pos", "point of sale", "cardholder", "pci", "stripe", "checkout", "terminal", "acquirer", "pan"],
    risks: ["RSK-CMP-PCI-001", "RSK-CYB-IDM-002", "RSK-DSP-ENC-001", "RSK-TEC-CHG-001", "RSK-CYB-LOG-001", "RSK-TPR-SUP-001"],
  },
  {
    id: "ai-genai",
    label: "AI / GenAI System",
    hint: "Models, LLM features, ML pipelines, or AI-enabled vendor tools",
    signals: ["ai", "genai", "llm", "machine learning", "model", "copilot", "openai", "anthropic", "chatbot", "ml", "inference", "training data"],
    risks: ["RSK-AI-GOV-001", "RSK-AI-DAT-001", "RSK-AI-OUT-001", "RSK-DSP-PRI-001", "RSK-TPR-SUP-001", "RSK-CYB-IDM-001"],
  },
  {
    id: "vendor-saas-general",
    label: "Third-Party SaaS (General)",
    hint: "Externally hosted application without direct financial/card scope",
    signals: ["saas", "vendor", "third party", "cloud", "subscription", "hosted", "platform", "tool"],
    risks: ["RSK-TPR-SUP-001", "RSK-TPR-DR-001", "RSK-CYB-IDM-001", "RSK-DSP-PRI-001", "RSK-DSP-RET-001"],
  },
  {
    id: "data-platform",
    label: "Data Platform / Warehouse",
    hint: "Systems aggregating sensitive or regulated data at scale",
    signals: ["data warehouse", "data lake", "analytics", "snowflake", "databricks", "bigquery", "etl", "pipeline", "customer data", "loyalty"],
    risks: ["RSK-DSP-PRI-001", "RSK-DSP-ENC-001", "RSK-DSP-RET-001", "RSK-CYB-IDM-002", "RSK-CYB-LOG-001", "RSK-TPR-SUP-001"],
  },
  {
    id: "infra-change",
    label: "Infrastructure / Platform Change",
    hint: "Cloud migration, network change, or core platform modification",
    signals: ["migration", "infrastructure", "network", "azure", "aws", "cloud migration", "firewall", "datacenter", "kubernetes", "platform"],
    risks: ["RSK-TEC-CHG-001", "RSK-TEC-AVL-001", "RSK-CYB-IDM-001", "RSK-CYB-LOG-001", "RSK-TPR-DR-001"],
  },
  {
    id: "site-outage",
    label: "Physical Site Outage / DR Event",
    hint: "Loss of a location or its systems from a disaster — assessing readiness to keep operating and recover",
    signals: ["tornado", "hurricane", "earthquake", "flood", "flooding", "wildfire", "storm", "disaster", "catastrophe", "outage", "blackout", "power outage", "offline", "operable", "down", "failover", "business continuity", "disaster recovery", "site loss", "evacuation", "unavailable", "resilience", "temperature", "food safety", "monitoring system", "sensor", "cold chain", "refrigeration", "food temperature", "haccp", "system failure"],
    risks: ["RSK-RES-BIA-001", "RSK-RES-DRP-001", "RSK-RES-SITE-001", "RSK-RES-BKP-001", "RSK-RES-COMM-001", "RSK-RES-PWR-001", "RSK-TEC-AVL-001", "RSK-TPR-DR-001"],
  },
];

/* ---------------------------------------------------------------------------
 * RISK LIBRARY
 * Each risk: stable ID, domain, plain-language statement, inherent rating
 * guidance, the controls that address it, and the frameworks it implicates.
 * ------------------------------------------------------------------------- */
export const RISKS = {
  "RSK-TEC-CHG-001": {
    id: "RSK-TEC-CHG-001", domain: "Technology", class: "Change Management",
    title: "Unauthorized or untested change introduces error or outage",
    statement: "Changes to the system are deployed without adequate testing, approval, or segregation of duties, leading to financial misstatement, data corruption, or service disruption.",
    inherent: "High",
    controls: ["CTL-CHG-001", "CTL-CHG-002", "CTL-CHG-003"],
    frameworks: ["SOX ITGC: Change Management", "PCI DSS 4.0: Req 6.5", "NIST CSF 2.0: PR.PS-01", "ISO 27001:2022: A.8.32"],
  },
  "RSK-TEC-AVL-001": {
    id: "RSK-TEC-AVL-001", domain: "Technology", class: "Availability",
    title: "System unavailability disrupts business operations",
    statement: "The system becomes unavailable due to infrastructure failure, capacity limits, or lack of resilience, with no tested recovery path within tolerance.",
    inherent: "High",
    controls: ["CTL-AVL-001", "CTL-AVL-002", "CTL-DR-001"],
    frameworks: ["NIST CSF 2.0: RC.RP-01", "ISO 27001:2022: A.5.30", "SOX ITGC: Computer Operations"],
  },
  "RSK-CYB-IDM-001": {
    id: "RSK-CYB-IDM-001", domain: "Cybersecurity", class: "Identity & Access",
    title: "Excessive or unauthorized access to the system",
    statement: "Users hold access beyond what their role requires, or access is granted without proper authorization, enabling fraud, error, or data exposure.",
    inherent: "High",
    controls: ["CTL-IAM-001", "CTL-IAM-002", "CTL-IAM-003"],
    frameworks: ["SOX ITGC: Logical Access", "PCI DSS 4.0: Req 7", "NIST CSF 2.0: PR.AA-01", "ISO 27001:2022: A.5.15"],
  },
  "RSK-CYB-IDM-002": {
    id: "RSK-CYB-IDM-002", domain: "Cybersecurity", class: "Authentication",
    title: "Weak authentication enables account compromise",
    statement: "The system permits weak authentication (no MFA, weak password policy, shared accounts), allowing credential-based compromise of sensitive functions or data.",
    inherent: "High",
    controls: ["CTL-IAM-002", "CTL-IAM-004"],
    frameworks: ["PCI DSS 4.0: Req 8.3-8.4", "NIST CSF 2.0: PR.AA-03", "ISO 27001:2022: A.5.17", "NIST 800-53 Rev5: IA-2"],
  },
  "RSK-CYB-LOG-001": {
    id: "RSK-CYB-LOG-001", domain: "Cybersecurity", class: "Logging & Monitoring",
    title: "Inadequate logging prevents detection of malicious activity",
    statement: "Security-relevant events are not logged, retained, or monitored, leaving compromise and insider misuse undetected and unprovable to auditors.",
    inherent: "Medium",
    controls: ["CTL-LOG-001", "CTL-LOG-002"],
    frameworks: ["PCI DSS 4.0: Req 10", "NIST CSF 2.0: DE.CM-01", "ISO 27001:2022: A.8.15", "NIST 800-53 Rev5: AU-2"],
  },
  "RSK-DSP-ENC-001": {
    id: "RSK-DSP-ENC-001", domain: "Data Security & Privacy", class: "Encryption",
    title: "Sensitive data exposed in transit or at rest",
    statement: "Sensitive or regulated data is stored or transmitted without adequate encryption, exposing it to interception or unauthorized access.",
    inherent: "High",
    controls: ["CTL-ENC-001", "CTL-ENC-002"],
    frameworks: ["PCI DSS 4.0: Req 3-4", "NIST CSF 2.0: PR.DS-01/02", "ISO 27001:2022: A.8.24"],
  },
  "RSK-DSP-RET-001": {
    id: "RSK-DSP-RET-001", domain: "Data Security & Privacy", class: "Retention",
    title: "Data retained beyond legal or business need",
    statement: "Data is retained longer than required by policy or law, increasing breach exposure and regulatory liability with no defensible deletion process.",
    inherent: "Medium",
    controls: ["CTL-DAT-001", "CTL-DAT-002"],
    frameworks: ["GDPR Art. 5(1)(e)", "NIST CSF 2.0: GV.PO-01", "ISO 27001:2022: A.5.33"],
  },
  "RSK-DSP-PRI-001": {
    id: "RSK-DSP-PRI-001", domain: "Data Security & Privacy", class: "Privacy",
    title: "Personal data processed without adequate privacy controls",
    statement: "Personal or customer data is collected, processed, or shared without lawful basis, notice, or data-subject rights handling, creating regulatory exposure.",
    inherent: "High",
    controls: ["CTL-DAT-001", "CTL-PRI-001"],
    frameworks: ["GDPR", "CCPA/CPRA", "NIST CSF 2.0: GV.PO-01", "ISO 27001:2022: A.5.34"],
  },
  "RSK-TPR-SUP-001": {
    id: "RSK-TPR-SUP-001", domain: "Third-Party Risk", class: "Vendor Due Diligence",
    title: "Vendor lacks adequate security and resilience posture",
    statement: "The third party has not demonstrated adequate security, privacy, and continuity controls, transferring unmanaged risk into the organization.",
    inherent: "High",
    controls: ["CTL-TPR-001", "CTL-TPR-002", "CTL-TPR-003"],
    frameworks: ["PCI DSS 4.0: Req 12.8", "NIST CSF 2.0: GV.SC-01", "SOX ITGC: Outsourced Services", "ISO 27001:2022: A.5.19"],
  },
  "RSK-TPR-DR-001": {
    id: "RSK-TPR-DR-001", domain: "Third-Party Risk", class: "Vendor Resilience",
    title: "Critical vendor outage exceeds recovery tolerance",
    statement: "A critical vendor has no committed or tested RTO/RPO, so an outage cascades into business disruption with no contingency the organization controls.",
    inherent: "High",
    controls: ["CTL-TPR-003", "CTL-DR-001", "CTL-DR-002"],
    frameworks: ["NIST CSF 2.0: GV.SC-05", "ISO 27001:2022: A.5.30", "SOX ITGC: Computer Operations"],
  },
  "RSK-CMP-SOX-001": {
    id: "RSK-CMP-SOX-001", domain: "Compliance", class: "SOX",
    title: "System in financial-reporting scope lacks reliable ITGCs",
    statement: "The system supports financial reporting but its IT general controls (access, change, operations) are not designed or operating effectively, undermining reliance.",
    inherent: "High",
    controls: ["CTL-CHG-001", "CTL-IAM-001", "CTL-LOG-001", "CTL-AVL-001"],
    frameworks: ["SOX 404", "SOX ITGC: All Domains", "COBIT 2019"],
  },
  "RSK-CMP-PCI-001": {
    id: "RSK-CMP-PCI-001", domain: "Compliance", class: "PCI",
    title: "Cardholder data environment scoping is incomplete or wrong",
    statement: "The cardholder data environment is not correctly scoped, so in-scope systems escape PCI controls, risking breach and loss of card-acceptance ability.",
    inherent: "Critical",
    controls: ["CTL-PCI-001", "CTL-ENC-001", "CTL-IAM-001", "CTL-LOG-001"],
    frameworks: ["PCI DSS 4.0: Scoping & Segmentation", "PCI DSS 4.0: Req 1", "PCI DSS 4.0: Req 12.5"],
  },
  "RSK-AI-GOV-001": {
    id: "RSK-AI-GOV-001", domain: "AI Governance", class: "Oversight",
    title: "AI system deployed without governance or accountability",
    statement: "An AI system is used without inventory, risk classification, approval, or a named accountable owner, creating unmanaged regulatory, ethical, and operational exposure.",
    inherent: "High",
    controls: ["CTL-AI-001", "CTL-AI-002"],
    frameworks: ["NIST AI RMF: GOVERN", "ISO 42001:2023", "EU AI Act (risk-tiering)"],
  },
  "RSK-AI-DAT-001": {
    id: "RSK-AI-DAT-001", domain: "AI Governance", class: "Data",
    title: "Sensitive data exposed to or through an AI model",
    statement: "Confidential or personal data is sent to an AI system without controls on training use, retention, or residency, risking leakage and privacy violation.",
    inherent: "High",
    controls: ["CTL-AI-002", "CTL-DAT-001", "CTL-ENC-001"],
    frameworks: ["NIST AI RMF: MAP/MEASURE", "GDPR", "ISO 42001:2023", "NIST CSF 2.0: PR.DS-01"],
  },
  "RSK-AI-OUT-001": {
    id: "RSK-AI-OUT-001", domain: "AI Governance", class: "Output Integrity",
    title: "AI output relied upon without validation",
    statement: "AI-generated output is used in decisions or work products without human validation, accuracy controls, or disclosure, propagating error at scale.",
    inherent: "Medium",
    controls: ["CTL-AI-003"],
    frameworks: ["NIST AI RMF: MEASURE/MANAGE", "ISO 42001:2023"],
  },
  "RSK-RES-BIA-001": {
    id: "RSK-RES-BIA-001", domain: "Technology", class: "Resilience",
    title: "Recovery priorities undefined — no current Business Impact Analysis",
    statement: "Critical processes, their maximum tolerable downtime, and recovery dependencies have not been analyzed, so recovery cannot be prioritized or sequenced when a site is lost.",
    inherent: "High",
    controls: ["CTL-BIA-001", "CTL-DR-001"],
    frameworks: ["NIST CSF 2.0: ID.RA-09", "ISO 22301: Clause 8.2.2 (BIA)", "ISO 27001:2022: A.5.30"],
  },
  "RSK-RES-DRP-001": {
    id: "RSK-RES-DRP-001", domain: "Technology", class: "Resilience",
    title: "No tested disaster recovery or site-recovery plan",
    statement: "There is no documented, exercised plan to recover systems and operations after a site loss, so recovery is improvised under pressure and likely to exceed business tolerances.",
    inherent: "Critical",
    controls: ["CTL-DR-001", "CTL-RES-EX-001", "CTL-RES-ROLE-001"],
    frameworks: ["NIST CSF 2.0: RC.RP-01", "ISO 22301: Clause 8.4", "SOX ITGC: Computer Operations"],
  },
  "RSK-RES-SITE-001": {
    id: "RSK-RES-SITE-001", domain: "Technology", class: "Resilience",
    title: "Single-site dependency with no failover or alternate site",
    statement: "Critical systems run from a single location or environment with no redundant site or failover capability, so loss of that location halts operations with no fallback.",
    inherent: "Critical",
    controls: ["CTL-RES-SITE-001", "CTL-AVL-001"],
    frameworks: ["NIST CSF 2.0: PR.IR-01", "ISO 22301: Clause 8.4.4", "ISO 27001:2022: A.8.14"],
  },
  "RSK-RES-BKP-001": {
    id: "RSK-RES-BKP-001", domain: "Technology", class: "Resilience",
    title: "Backups missing, not off-site, or restoration unverified",
    statement: "Data and system backups are absent, stored with the systems they protect, or never test-restored, so information may be unrecoverable after a site-destroying event.",
    inherent: "Critical",
    controls: ["CTL-AVL-001", "CTL-RES-SITE-001"],
    frameworks: ["NIST CSF 2.0: PR.DS-11", "ISO 22301: Clause 8.4", "ISO 27001:2022: A.8.13"],
  },
  "RSK-RES-COMM-001": {
    id: "RSK-RES-COMM-001", domain: "Technology", class: "Resilience",
    title: "No crisis communication or emergency notification plan",
    statement: "There is no tested way to reach staff, customers, responders, and vendors during an outage, so recovery is uncoordinated and safety and reputational harm increase.",
    inherent: "High",
    controls: ["CTL-RES-COMM-001", "CTL-RES-ROLE-001"],
    frameworks: ["NIST CSF 2.0: RC.CO-03", "ISO 22301: Clause 8.4.3", "ISO 27001:2022: A.5.24"],
  },
  "RSK-RES-PWR-001": {
    id: "RSK-RES-PWR-001", domain: "Technology", class: "Resilience",
    title: "No backup power or redundant connectivity at the site",
    statement: "Stores depend on grid power and a single network path with no UPS, generator, or failover connectivity, so point-of-sale, payment, and life-safety systems fail immediately on loss of power or circuit.",
    inherent: "High",
    controls: ["CTL-RES-PWR-001"],
    frameworks: ["NIST CSF 2.0: PR.IR-04", "ISO 22301: Clause 8.4.4", "PCI DSS 4.0: Req 12.10.1"],
  },
};

/* ---------------------------------------------------------------------------
 * CONTROL LIBRARY
 * Each control: ID, type (Preventive/Detective/Corrective), statement,
 * suggested owner, frequency, and the evidence an auditor would expect.
 * ------------------------------------------------------------------------- */
export const CONTROLS = {
  "CTL-CHG-001": { id: "CTL-CHG-001", title: "Change approval & segregation of duties", type: "Preventive",
    statement: "All changes require documented approval prior to deployment; the person who develops a change cannot be the sole person who approves and deploys it.",
    owner: "IT Operations / Change Manager", frequency: "Per change",
    evidence: "Change tickets showing approver distinct from developer; CAB minutes; deployment logs tied to approved tickets." },
  "CTL-CHG-002": { id: "CTL-CHG-002", title: "Pre-deployment testing", type: "Preventive",
    statement: "Changes are tested in a non-production environment with documented results before production deployment.",
    owner: "QA / Engineering", frequency: "Per change",
    evidence: "Test plans and results attached to change records; evidence of non-prod environment." },
  "CTL-CHG-003": { id: "CTL-CHG-003", title: "Emergency change procedure", type: "Corrective",
    statement: "Emergency changes follow a defined expedited path with retrospective approval and review within a set window.",
    owner: "Change Manager", frequency: "Per emergency change",
    evidence: "Emergency change records with retrospective approval timestamps within SLA." },
  "CTL-AVL-001": { id: "CTL-AVL-001", title: "Backup & restoration testing", type: "Detective",
    statement: "Backups run on a defined schedule and restoration is periodically tested to confirm recoverability.",
    owner: "IT Operations", frequency: "Backups daily; restore test quarterly",
    evidence: "Backup job logs; documented restore test results with success confirmation." },
  "CTL-AVL-002": { id: "CTL-AVL-002", title: "Capacity & availability monitoring", type: "Detective",
    statement: "System capacity and availability are monitored with alerting against defined thresholds.",
    owner: "IT Operations / SRE", frequency: "Continuous",
    evidence: "Monitoring dashboards; alert configuration; incident records from threshold breaches." },
  "CTL-DR-001": { id: "CTL-DR-001", title: "Documented & tested DR runbook", type: "Corrective",
    statement: "A disaster recovery runbook exists with defined RTO/RPO and is tested at least annually.",
    owner: "GRC / IT Operations", frequency: "Annual test",
    evidence: "DR runbook; tabletop or failover test report with RTO/RPO achieved and gaps logged." },
  "CTL-DR-002": { id: "CTL-DR-002", title: "Vendor RTO/RPO attestation", type: "Detective",
    statement: "Critical vendors provide annual evidence of DR testing meeting committed RTO/RPO.",
    owner: "GRC / Vendor Owner", frequency: "Annual",
    evidence: "Vendor DR attestation or SOC 2 with DR scope; entry in vendor DR register." },
  "CTL-IAM-001": { id: "CTL-IAM-001", title: "Access provisioning & authorization", type: "Preventive",
    statement: "Access is granted only on documented manager approval, on least-privilege basis.",
    owner: "IAM / System Owner", frequency: "Per request",
    evidence: "Access request records with approval; role definitions; provisioning logs." },
  "CTL-IAM-002": { id: "CTL-IAM-002", title: "Multi-factor authentication", type: "Preventive",
    statement: "MFA is enforced for all access to the system, especially remote and privileged access.",
    owner: "IAM / Security", frequency: "Continuous",
    evidence: "MFA configuration screenshots; authentication logs showing MFA challenge." },
  "CTL-IAM-003": { id: "CTL-IAM-003", title: "Periodic access review (recertification)", type: "Detective",
    statement: "User access is reviewed and recertified on a defined cadence; inappropriate access is revoked.",
    owner: "System Owner / GRC", frequency: "Quarterly (privileged) / Annual (standard)",
    evidence: "Completed access review with reviewer attestation, version, date; revocation records for flagged access." },
  "CTL-IAM-004": { id: "CTL-IAM-004", title: "Password & credential policy", type: "Preventive",
    statement: "Authentication parameters meet or exceed the in-force standard; shared accounts are prohibited or vaulted.",
    owner: "IAM / Security", frequency: "Continuous",
    evidence: "Password policy configuration; PAM vault records for any shared/service accounts." },
  "CTL-LOG-001": { id: "CTL-LOG-001", title: "Security event logging", type: "Detective",
    statement: "Security-relevant events are logged with sufficient detail and protected from tampering.",
    owner: "Security / IT Operations", frequency: "Continuous",
    evidence: "Log configuration; sample log entries; evidence of log integrity protection." },
  "CTL-LOG-002": { id: "CTL-LOG-002", title: "Log review & alerting", type: "Detective",
    statement: "Logs are reviewed (typically via SIEM) and actionable alerts are triaged on a defined cadence.",
    owner: "SOC / Security", frequency: "Continuous / Daily triage",
    evidence: "SIEM alert rules; triage records; escalation tickets from alerts." },
  "CTL-ENC-001": { id: "CTL-ENC-001", title: "Encryption at rest", type: "Preventive",
    statement: "Sensitive data is encrypted at rest using approved algorithms and managed keys.",
    owner: "Engineering / Security", frequency: "Continuous",
    evidence: "Encryption configuration; key management records; algorithm/standard documentation." },
  "CTL-ENC-002": { id: "CTL-ENC-002", title: "Encryption in transit", type: "Preventive",
    statement: "Data in transit is protected with current TLS; weak protocols are disabled.",
    owner: "Engineering / Security", frequency: "Continuous",
    evidence: "TLS configuration; scan results confirming weak protocols disabled." },
  "CTL-DAT-001": { id: "CTL-DAT-001", title: "Data classification & handling", type: "Preventive",
    statement: "Data is classified and handled per policy, driving retention, access, and protection requirements.",
    owner: "Data Owner / GRC", frequency: "Continuous",
    evidence: "Data classification records; handling procedures; data inventory." },
  "CTL-DAT-002": { id: "CTL-DAT-002", title: "Retention & defensible deletion", type: "Corrective",
    statement: "Data is retained per schedule and deleted via a defensible, logged process when no longer needed.",
    owner: "Data Owner / Legal", frequency: "Per schedule",
    evidence: "Retention schedule; deletion logs; legal hold exceptions documented." },
  "CTL-PRI-001": { id: "CTL-PRI-001", title: "Privacy notice & data-subject rights", type: "Preventive",
    statement: "Processing has a lawful basis, notice is provided, and data-subject requests are handled within statutory timelines.",
    owner: "Privacy / Legal", frequency: "Continuous",
    evidence: "Privacy notice; DSAR procedure and logs; records of processing activities." },
  "CTL-TPR-001": { id: "CTL-TPR-001", title: "Vendor security due diligence", type: "Preventive",
    statement: "Vendors are assessed for security/privacy posture before onboarding and re-assessed on a risk-based cadence.",
    owner: "GRC / TPRM", frequency: "Onboarding + annual (critical)",
    evidence: "Completed due-diligence questionnaire; SOC 2/ISO review notes; assessment record in TPRM tool." },
  "CTL-TPR-002": { id: "CTL-TPR-002", title: "Contractual security & privacy terms", type: "Preventive",
    statement: "Contracts include security, privacy, breach-notification, and right-to-audit provisions appropriate to the data handled.",
    owner: "Legal / Procurement", frequency: "Per contract",
    evidence: "Executed contract with relevant clauses; DPA where personal data is processed." },
  "CTL-TPR-003": { id: "CTL-TPR-003", title: "Ongoing vendor monitoring", type: "Detective",
    statement: "Critical vendors are monitored for security posture, performance, and continuity throughout the relationship.",
    owner: "GRC / Vendor Owner", frequency: "Continuous / Annual review",
    evidence: "Continuous monitoring records; annual review notes; issue log for vendor findings." },
  "CTL-PCI-001": { id: "CTL-PCI-001", title: "CDE scoping & segmentation", type: "Preventive",
    statement: "The cardholder data environment is defined, documented, and segmented from out-of-scope networks; scope is validated at least annually.",
    owner: "Security / GRC", frequency: "Annual + on change",
    evidence: "Scope documentation; network/data-flow diagrams; segmentation test results." },
  "CTL-AI-001": { id: "CTL-AI-001", title: "AI inventory & risk classification", type: "Preventive",
    statement: "AI systems are inventoried and risk-classified, with a named accountable owner before production use.",
    owner: "AI Governance / GRC", frequency: "Onboarding + periodic",
    evidence: "AI inventory entry; risk classification record; named owner." },
  "CTL-AI-002": { id: "CTL-AI-002", title: "AI data-handling controls", type: "Preventive",
    statement: "Data sent to AI systems is governed for sensitivity, training-use, retention, and residency per policy.",
    owner: "AI Governance / Security", frequency: "Continuous",
    evidence: "Data-handling agreement / config showing no-train and retention terms; DPIA where applicable." },
  "CTL-AI-003": { id: "CTL-AI-003", title: "Human validation of AI output", type: "Detective",
    statement: "AI output used in decisions or work products is validated by a competent human who remains accountable for the result.",
    owner: "Process Owner", frequency: "Per use",
    evidence: "Review/attestation records; disclosure of AI assistance where required." },
  "CTL-BIA-001": { id: "CTL-BIA-001", title: "Business Impact Analysis", type: "Preventive",
    statement: "Critical processes are identified and rated for maximum tolerable downtime, data-loss tolerance, and dependencies; the BIA drives recovery priorities and RTO/RPO.",
    owner: "Business Continuity / Risk", frequency: "Reviewed at least annually",
    evidence: "Current BIA with criticality ratings, RTO/RPO per process, and dependency mapping, with approval and review date." },
  "CTL-RES-SITE-001": { id: "CTL-RES-SITE-001", title: "Alternate site / failover capability", type: "Preventive",
    statement: "Critical systems can run from a redundant site, region, or cloud failover, with data replicated off the primary location so a site loss does not halt operations.",
    owner: "IT Operations / Infrastructure", frequency: "Validated at least annually",
    evidence: "Architecture showing redundancy and replication; evidence of a successful failover or recovery test." },
  "CTL-RES-COMM-001": { id: "CTL-RES-COMM-001", title: "Crisis communication & emergency notification", type: "Corrective",
    statement: "A maintained, tested plan reaches staff, customers, responders, and critical vendors during an outage, including a mass-notification method and an up-to-date contact tree.",
    owner: "Business Continuity / Communications", frequency: "Contacts reviewed quarterly; tested annually",
    evidence: "Crisis communication plan; mass-notification system records; results of a notification test." },
  "CTL-RES-PWR-001": { id: "CTL-RES-PWR-001", title: "Site power & connectivity redundancy", type: "Preventive",
    statement: "Sites running critical systems have backup power (UPS and/or generator) and redundant connectivity sufficient to keep point-of-sale, payment, and life-safety systems operating through a power or circuit loss.",
    owner: "Facilities / IT Operations", frequency: "Tested per schedule",
    evidence: "UPS and generator test logs; redundant-circuit configuration; store connectivity failover test." },
  "CTL-RES-ROLE-001": { id: "CTL-RES-ROLE-001", title: "Emergency response & recovery roles", type: "Preventive",
    statement: "Recovery roles, an incident commander, succession, and on-call coverage are defined and communicated so a named, available person can execute recovery when an event occurs.",
    owner: "Business Continuity", frequency: "Reviewed at least annually",
    evidence: "Documented roles and succession; on-call roster; activation or exercise records showing role coverage." },
  "CTL-RES-EX-001": { id: "CTL-RES-EX-001", title: "Periodic DR/BCP exercise", type: "Detective",
    statement: "Recovery plans are exercised at least annually through tabletop and functional tests that validate RTO/RPO and surface gaps for remediation.",
    owner: "Business Continuity / IT Operations", frequency: "At least annually",
    evidence: "Exercise plan, participants, results against RTO/RPO, and a tracked remediation list for gaps found." },
};

/* ---------------------------------------------------------------------------
 * SAMPLE INITIATIVES — for the "try an example" affordance
 * ------------------------------------------------------------------------- */
export const SAMPLES = [
  "A tornado takes a set of our C-stores offline with all systems down — assess our readiness to keep operating and recover.",
  "We are implementing ServiceNow GRC to manage our risk and control program.",
  "We are adding a third-party AI chatbot that answers customer questions using our knowledge base.",
  "We are migrating our point-of-sale payment processing to a new vendor.",
  "We are rolling out Workday for payroll and HR across all locations.",
  "We are standing up a Snowflake data warehouse aggregating customer loyalty data.",
];

/* ---------------------------------------------------------------------------
 * CONTROL PROCEDURES
 * For each control: the steps to stand it up (implementation) and the procedure
 * an auditor would run to test it (testing). Kept separate from CONTROLS so the
 * base library stays lean and the procedures can be versioned independently.
 * This is the curated depth that turns a control list into an actionable plan.
 * ------------------------------------------------------------------------- */
export const CONTROL_PROCEDURES = {
  "CTL-CHG-001": { implementation: ["Define change types and required approvers in the change policy", "Configure the change tool to enforce approver ≠ implementer", "Stand up a CAB or designated approver for normal changes"],
    testing: "Select a sample of production changes; confirm each has documented approval recorded before deployment and that the approver is distinct from the developer/implementer." },
  "CTL-CHG-002": { implementation: ["Establish a non-production test environment", "Require test evidence attached to each change record before approval"],
    testing: "For a sample of changes, inspect attached test plans and results and confirm testing occurred in non-production prior to release." },
  "CTL-CHG-003": { implementation: ["Define the emergency change path and retrospective-approval SLA in policy", "Configure an expedited ticket type flagged as emergency"],
    testing: "Select emergency changes; verify retrospective approval and review were completed within the defined window." },
  "CTL-AVL-001": { implementation: ["Configure scheduled backups for the system and its data", "Schedule and document periodic restoration tests"],
    testing: "Inspect backup job logs for the period and obtain evidence of at least one successful restoration test." },
  "CTL-AVL-002": { implementation: ["Define availability and capacity thresholds and alert routing", "Deploy monitoring against those thresholds"],
    testing: "Review monitoring configuration and a sample of threshold-breach alerts to confirm detection and response occurred." },
  "CTL-DR-001": { implementation: ["Document the DR runbook with RTO/RPO, recovery steps, and contacts", "Schedule at least annual DR testing", "Store the runbook off the systems it recovers"],
    testing: "Obtain the DR runbook and the most recent test report; confirm the test met the documented RTO/RPO or that gaps were logged and remediated." },
  "CTL-DR-002": { implementation: ["Add a DR-evidence requirement to critical-vendor onboarding and annual review", "Record vendor RTO/RPO commitments in the vendor DR register"],
    testing: "For a sample of critical vendors, confirm current DR test evidence (vendor report or SOC 2 with DR scope) is on file and within tolerance." },
  "CTL-IAM-001": { implementation: ["Define role-based access profiles for the system", "Require documented manager approval for access requests", "Provision on a least-privilege basis"],
    testing: "Select a sample of access grants; confirm documented approval exists and access aligns to the user's role." },
  "CTL-IAM-002": { implementation: ["Enable MFA enforcement on the system or via the identity provider", "Require MFA for remote and privileged access"],
    testing: "Inspect MFA configuration and a sample of authentication logs to confirm MFA is enforced for in-scope access." },
  "CTL-IAM-003": { implementation: ["Define review cadence (quarterly privileged, annual standard)", "Generate entitlement extracts for reviewers", "Track revocations to closure"],
    testing: "Obtain a completed access review; confirm reviewer attestation, date, and evidence that flagged access was revoked." },
  "CTL-IAM-004": { implementation: ["Configure authentication parameters to meet the standard", "Vault or eliminate shared and service accounts via PAM"],
    testing: "Review password/authentication configuration and PAM records for any shared or service accounts." },
  "CTL-LOG-001": { implementation: ["Enable security-relevant event logging on the system", "Protect logs from modification and forward to a central store"],
    testing: "Inspect logging configuration and sample log entries; confirm coverage of key security events and tamper protection." },
  "CTL-LOG-002": { implementation: ["Forward logs to the SIEM", "Define alert rules and a daily triage process"],
    testing: "Review SIEM alert rules and a sample of triaged alerts with evidence of escalation where warranted." },
  "CTL-ENC-001": { implementation: ["Enable encryption at rest using approved algorithms", "Manage keys per the key-management standard"],
    testing: "Confirm encryption-at-rest configuration and key-management records for the in-scope data store(s)." },
  "CTL-ENC-002": { implementation: ["Enforce current TLS on all connections", "Disable weak protocols and ciphers"],
    testing: "Run or obtain a scan confirming current TLS is enforced and weak protocols are disabled." },
  "CTL-DAT-001": { implementation: ["Classify the data the system handles", "Apply handling rules driven by the classification"],
    testing: "Confirm the data is classified and that handling (access, retention, protection) matches the classification policy." },
  "CTL-DAT-002": { implementation: ["Define the retention schedule for the data", "Implement a logged deletion process with legal-hold exceptions"],
    testing: "Inspect the retention schedule and deletion logs; confirm data past retention is deleted and holds are documented." },
  "CTL-PRI-001": { implementation: ["Confirm lawful basis and provide a privacy notice", "Stand up a data-subject-request process meeting statutory timelines"],
    testing: "Review the privacy notice, records of processing, and a sample of data-subject requests handled within required timelines." },
  "CTL-TPR-001": { implementation: ["Require a security and privacy assessment before onboarding", "Set a risk-based re-assessment cadence"],
    testing: "For a sample of vendors, confirm a completed due-diligence assessment exists and is current per the risk-based cadence." },
  "CTL-TPR-002": { implementation: ["Include security, privacy, breach-notification, and audit clauses in contracts", "Execute a DPA where personal data is processed"],
    testing: "Inspect executed contracts for the required clauses and confirm a DPA where applicable." },
  "CTL-TPR-003": { implementation: ["Define monitoring scope for critical vendors", "Conduct annual reviews and log findings"],
    testing: "Confirm ongoing monitoring records and the most recent annual review for a sample of critical vendors." },
  "CTL-PCI-001": { implementation: ["Document the cardholder data environment and data flows", "Segment the CDE from out-of-scope networks", "Validate scope at least annually"],
    testing: "Obtain CDE scope documentation and segmentation test results; confirm scope was validated within the last year." },
  "CTL-AI-001": { implementation: ["Add the AI system to the AI inventory", "Risk-classify it and assign a named accountable owner before production"],
    testing: "Confirm the AI system appears in the inventory with a risk classification and a named owner predating production use." },
  "CTL-AI-002": { implementation: ["Confirm no-train and retention terms for data sent to the AI system", "Apply residency and sensitivity controls per policy"],
    testing: "Review the AI data-handling agreement/configuration confirming no-training-use, retention, and residency terms; obtain a DPIA where applicable." },
  "CTL-AI-003": { implementation: ["Define where AI output requires human validation", "Capture reviewer attestation and disclosure of AI assistance"],
    testing: "For a sample of AI-assisted outputs, confirm a competent human reviewed and is recorded as accountable for the result." },
  "CTL-BIA-001": { implementation: ["Inventory critical processes and the systems and data they depend on", "Rate each for maximum tolerable downtime and data-loss tolerance and set RTO/RPO", "Review and approve the BIA at least annually"],
    testing: "Obtain the current BIA; confirm critical processes carry RTO/RPO and dependency mapping and that it was reviewed within the last year." },
  "CTL-RES-SITE-001": { implementation: ["Identify critical systems requiring redundancy from the BIA", "Provision a redundant site, region, or cloud failover with off-site data replication", "Test failover or recovery at least annually"],
    testing: "Review the redundancy and replication architecture and obtain evidence of a successful failover or recovery test within tolerance." },
  "CTL-RES-COMM-001": { implementation: ["Build and maintain a contact tree for staff, customers, responders, and critical vendors", "Stand up a mass-notification method and define activation triggers", "Test the notification path at least annually"],
    testing: "Inspect the crisis communication plan and contact-tree currency and obtain results of a notification test." },
  "CTL-RES-PWR-001": { implementation: ["Determine power and connectivity needs for critical store systems", "Install backup power (UPS or generator) and redundant connectivity", "Test power and connectivity failover on a schedule"],
    testing: "Review UPS and generator test logs and redundant-connectivity configuration and obtain a store failover test result." },
  "CTL-RES-ROLE-001": { implementation: ["Define recovery roles, incident commander, and succession", "Establish on-call coverage and communicate responsibilities", "Confirm role coverage during each exercise"],
    testing: "Obtain documented recovery roles and the on-call roster; confirm coverage via the most recent exercise sign-in or activation record." },
  "CTL-RES-EX-001": { implementation: ["Schedule at least annual tabletop and functional recovery exercises", "Run the exercise against documented RTO/RPO", "Log gaps and track remediation to closure"],
    testing: "Obtain the most recent exercise report; confirm it tested against RTO/RPO and that gaps are tracked to remediation." },
};

/* ---------------------------------------------------------------------------
 * RECOMMENDED GOVERNANCE DOCUMENTS
 * Each governance doc has a stable ID, a tier (Charter/Policy/Standard/
 * Procedure/Guideline), and a one-line intent. CONTROL_DOCS maps each control
 * to the docs that should govern it. The hierarchy: a Charter establishes
 * authority for a function; a Policy mandates a position; a Standard specifies
 * how; a Procedure operationalizes; a Guideline advises.
 *
 * Treated as DATA on purpose: this is a recommendation of the document set, not
 * an authoring of the documents themselves. Tier-ordering at render time is
 * Charter -> Policy -> Standard -> Procedure -> Guideline.
 * ------------------------------------------------------------------------- */
export const DOC_TIER_ORDER = ["Charter", "Policy", "Standard", "Procedure", "Guideline"];

export const DOCS = {
  // CHARTERS
  "DOC-CHTR-GRC":      { id: "DOC-CHTR-GRC",      tier: "Charter",   title: "GRC Function Charter",                   intent: "Establishes scope, authority, and accountability for the governance, risk, and compliance function." },
  "DOC-CHTR-BCM":      { id: "DOC-CHTR-BCM",      tier: "Charter",   title: "Business Continuity Management Charter", intent: "Establishes authority and mandate for the business-continuity program." },

  // POLICIES (the mandates)
  "DOC-POL-ISP":       { id: "DOC-POL-ISP",       tier: "Policy",    title: "Information Security Policy",            intent: "Mandates the protection of information assets across the organization." },
  "DOC-POL-AC":        { id: "DOC-POL-AC",        tier: "Policy",    title: "Access Control Policy",                  intent: "Mandates how access to systems and data is granted, reviewed, and revoked." },
  "DOC-POL-CHG":       { id: "DOC-POL-CHG",       tier: "Policy",    title: "Change Management Policy",               intent: "Mandates controlled change to production systems." },
  "DOC-POL-DR":        { id: "DOC-POL-DR",        tier: "Policy",    title: "Disaster Recovery Policy",               intent: "Mandates that critical systems can be recovered within defined tolerances." },
  "DOC-POL-BCP":       { id: "DOC-POL-BCP",       tier: "Policy",    title: "Business Continuity Policy",             intent: "Mandates that critical processes continue through disruption." },
  "DOC-POL-DC":        { id: "DOC-POL-DC",        tier: "Policy",    title: "Data Classification & Handling Policy",  intent: "Mandates classification of data and handling rules by classification." },
  "DOC-POL-RET":       { id: "DOC-POL-RET",       tier: "Policy",    title: "Data Retention & Disposal Policy",       intent: "Mandates retention periods and secure disposal of data." },
  "DOC-POL-PRI":       { id: "DOC-POL-PRI",       tier: "Policy",    title: "Privacy Policy (internal)",              intent: "Mandates lawful, fair, and accountable processing of personal data." },
  "DOC-POL-TPR":       { id: "DOC-POL-TPR",       tier: "Policy",    title: "Third-Party Risk Management Policy",     intent: "Mandates how vendors are assessed, contracted, and monitored." },
  "DOC-POL-LOG":       { id: "DOC-POL-LOG",       tier: "Policy",    title: "Logging & Monitoring Policy",            intent: "Mandates what is logged, how logs are protected, and how they are monitored." },
  "DOC-POL-AI":        { id: "DOC-POL-AI",        tier: "Policy",    title: "Acceptable Use of AI Policy",            intent: "Mandates governance of AI systems including inventory, risk, and human oversight." },

  // STANDARDS (the how)
  "DOC-STD-AUTH":      { id: "DOC-STD-AUTH",      tier: "Standard",  title: "Authentication Standard",                intent: "Specifies authentication parameters including MFA, password, and service-account requirements." },
  "DOC-STD-CRYPTO":    { id: "DOC-STD-CRYPTO",    tier: "Standard",  title: "Cryptography Standard",                  intent: "Specifies approved algorithms, key strength, key management, and TLS configuration." },
  "DOC-STD-LOG":       { id: "DOC-STD-LOG",       tier: "Standard",  title: "Logging Standard",                       intent: "Specifies which events are logged, retention, integrity, and forwarding to SIEM." },
  "DOC-STD-BKP":       { id: "DOC-STD-BKP",       tier: "Standard",  title: "Backup & Restore Standard",              intent: "Specifies backup frequency, off-site storage, and restoration-test cadence." },
  "DOC-STD-PCI":       { id: "DOC-STD-PCI",       tier: "Standard",  title: "PCI Scope & Segmentation Standard",      intent: "Specifies CDE boundaries, segmentation, and validation cadence for PCI scope." },
  "DOC-STD-AI":        { id: "DOC-STD-AI",        tier: "Standard",  title: "AI System Risk & Inventory Standard",    intent: "Specifies AI system intake, risk-tiering, and ownership requirements." },

  // PROCEDURES (the operationalization)
  "DOC-SOP-ACCREV":    { id: "DOC-SOP-ACCREV",    tier: "Procedure", title: "Access Review SOP",                      intent: "Operationalizes periodic entitlement reviews and revocation tracking." },
  "DOC-SOP-CHGAPP":    { id: "DOC-SOP-CHGAPP",    tier: "Procedure", title: "Change Approval & Testing SOP",          intent: "Operationalizes CAB review, test evidence, and emergency-change retrospective approval." },
  "DOC-SOP-DRTEST":    { id: "DOC-SOP-DRTEST",    tier: "Procedure", title: "DR Test & Exercise SOP",                 intent: "Operationalizes recovery exercise planning, execution, and gap remediation." },
  "DOC-SOP-VENDOR":    { id: "DOC-SOP-VENDOR",    tier: "Procedure", title: "Vendor Onboarding & Monitoring SOP",     intent: "Operationalizes due-diligence intake, contract clauses, and ongoing monitoring." },
  "DOC-SOP-DSR":       { id: "DOC-SOP-DSR",       tier: "Procedure", title: "Data Subject Request Handling SOP",      intent: "Operationalizes intake and timely response to data-subject requests." },
  "DOC-SOP-CRISIS":    { id: "DOC-SOP-CRISIS",    tier: "Procedure", title: "Crisis Communication SOP",               intent: "Operationalizes activation, contact tree, and mass notification during an outage." },
  "DOC-SOP-BIA":       { id: "DOC-SOP-BIA",       tier: "Procedure", title: "Business Impact Analysis SOP",           intent: "Operationalizes how BIAs are scoped, performed, reviewed, and approved." },

  // GUIDELINES (the advisory)
  "DOC-GDL-AIUSE":     { id: "DOC-GDL-AIUSE",     tier: "Guideline", title: "AI Output Review Guideline",             intent: "Advises practitioners on when and how to review AI-generated outputs." },
};

// Each control points to the governance documents that should govern it.
export const CONTROL_DOCS = {
  "CTL-CHG-001":      ["DOC-POL-CHG", "DOC-SOP-CHGAPP"],
  "CTL-CHG-002":      ["DOC-POL-CHG", "DOC-SOP-CHGAPP"],
  "CTL-CHG-003":      ["DOC-POL-CHG", "DOC-SOP-CHGAPP"],
  "CTL-AVL-001":      ["DOC-POL-DR", "DOC-STD-BKP"],
  "CTL-AVL-002":      ["DOC-POL-LOG"],
  "CTL-DR-001":       ["DOC-POL-DR", "DOC-SOP-DRTEST"],
  "CTL-DR-002":       ["DOC-POL-TPR", "DOC-POL-DR"],
  "CTL-IAM-001":      ["DOC-POL-AC", "DOC-SOP-ACCREV"],
  "CTL-IAM-002":      ["DOC-POL-AC", "DOC-STD-AUTH"],
  "CTL-IAM-003":      ["DOC-POL-AC", "DOC-SOP-ACCREV"],
  "CTL-IAM-004":      ["DOC-POL-AC", "DOC-STD-AUTH"],
  "CTL-LOG-001":      ["DOC-POL-LOG", "DOC-STD-LOG"],
  "CTL-LOG-002":      ["DOC-POL-LOG", "DOC-STD-LOG"],
  "CTL-ENC-001":      ["DOC-POL-ISP", "DOC-STD-CRYPTO"],
  "CTL-ENC-002":      ["DOC-POL-ISP", "DOC-STD-CRYPTO"],
  "CTL-DAT-001":      ["DOC-POL-DC"],
  "CTL-DAT-002":      ["DOC-POL-RET"],
  "CTL-PRI-001":      ["DOC-POL-PRI", "DOC-SOP-DSR"],
  "CTL-TPR-001":      ["DOC-POL-TPR", "DOC-SOP-VENDOR"],
  "CTL-TPR-002":      ["DOC-POL-TPR"],
  "CTL-TPR-003":      ["DOC-POL-TPR", "DOC-SOP-VENDOR"],
  "CTL-PCI-001":      ["DOC-POL-ISP", "DOC-STD-PCI"],
  "CTL-AI-001":       ["DOC-POL-AI", "DOC-STD-AI"],
  "CTL-AI-002":       ["DOC-POL-AI", "DOC-POL-PRI"],
  "CTL-AI-003":       ["DOC-POL-AI", "DOC-GDL-AIUSE"],
  "CTL-BIA-001":      ["DOC-CHTR-BCM", "DOC-POL-BCP", "DOC-SOP-BIA"],
  "CTL-RES-SITE-001": ["DOC-POL-DR", "DOC-STD-BKP"],
  "CTL-RES-COMM-001": ["DOC-CHTR-BCM", "DOC-SOP-CRISIS"],
  "CTL-RES-PWR-001":  ["DOC-POL-DR"],
  "CTL-RES-ROLE-001": ["DOC-CHTR-BCM", "DOC-POL-BCP"],
  "CTL-RES-EX-001":   ["DOC-POL-DR", "DOC-SOP-DRTEST"],
};

/* ---------------------------------------------------------------------------
 * GOVERNANCE DOCUMENT RECOMMENDATIONS
 * Each control declares the governance document(s) that should mandate it,
 * specify it, or operationalize it. The engine rolls these up across the
 * assessment so the user sees not just "what controls" but "what governance
 * scaffolding backs them." Deterministic, deduplicated, tiered.
 *
 * Tiers follow standard GRC hierarchy:
 *   policy    - mandates ("we will")
 *   standard  - specifies ("how we will")
 *   procedure - operationalizes ("step by step")
 *   guideline - advises ("we recommend")
 *   charter   - establishes a function's mandate and authority
 *
 * This RECOMMENDS the document set. It does not author the documents. The
 * starter blurb is meta — what the document is for — never the document body.
 * ------------------------------------------------------------------------- */
export const DOC_TIERS = [
  { id: "policy",    label: "Policies",    blurb: "Mandates — what we will do and why" },
  { id: "standard",  label: "Standards",   blurb: "Specifications — the rules controls must meet" },
  { id: "procedure", label: "Procedures",  blurb: "Step-by-step instructions for executing controls" },
  { id: "guideline", label: "Guidelines",  blurb: "Recommended practices and patterns" },
  { id: "charter",   label: "Charters",    blurb: "Mandate, scope, and authority for a function" },
];

export const CONTROL_DOCUMENTS = {
  "CTL-CHG-001": [{ tier: "policy", name: "Change Management Policy", purpose: "Establish required approvals, segregation of duties, and change classifications." }],
  "CTL-CHG-002": [{ tier: "procedure", name: "Change Testing Procedure", purpose: "How changes are tested in non-production and what test evidence is retained." }],
  "CTL-CHG-003": [{ tier: "procedure", name: "Emergency Change Procedure", purpose: "Expedited path for urgent changes with retrospective approval requirements." }],
  "CTL-AVL-001": [{ tier: "standard", name: "Backup & Recovery Standard", purpose: "Backup scope, frequency, retention, encryption, and restoration test cadence." }],
  "CTL-AVL-002": [{ tier: "standard", name: "Availability & Capacity Monitoring Standard", purpose: "Thresholds, alert routing, and response expectations for availability events." }],
  "CTL-DR-001":  [{ tier: "policy", name: "Disaster Recovery Policy", purpose: "DR scope, governance, and the requirement to test recovery plans." }, { tier: "procedure", name: "DR Runbook", purpose: "Step-by-step recovery instructions including RTO/RPO, roles, and dependencies." }],
  "CTL-DR-002":  [{ tier: "standard", name: "Third-Party Resilience Standard", purpose: "Resilience evidence required from critical vendors at onboarding and annually." }],
  "CTL-IAM-001": [{ tier: "policy", name: "Access Control Policy", purpose: "Authorization, least privilege, and access lifecycle requirements." }],
  "CTL-IAM-002": [{ tier: "standard", name: "Authentication Standard", purpose: "MFA scope, allowed factors, and exception handling." }],
  "CTL-IAM-003": [{ tier: "procedure", name: "Access Review (Recertification) Procedure", purpose: "Cadence, reviewer roles, and revocation tracking for entitlement reviews." }],
  "CTL-IAM-004": [{ tier: "standard", name: "Authentication Standard", purpose: "Password complexity, rotation, and credential vaulting (incl. service accounts)." }],
  "CTL-LOG-001": [{ tier: "standard", name: "Logging & Monitoring Standard", purpose: "Required log sources, events, retention, and tamper protection." }],
  "CTL-LOG-002": [{ tier: "procedure", name: "Log Review & Alert Triage Procedure", purpose: "SIEM alert workflow, severity rules, and escalation paths." }],
  "CTL-ENC-001": [{ tier: "standard", name: "Cryptography Standard", purpose: "Approved algorithms, key strengths, and at-rest encryption requirements." }],
  "CTL-ENC-002": [{ tier: "standard", name: "Cryptography Standard", purpose: "TLS versions, cipher suites, and in-transit protection requirements." }],
  "CTL-DAT-001": [{ tier: "policy", name: "Data Classification & Handling Policy", purpose: "Classification levels and handling rules driven by classification." }],
  "CTL-DAT-002": [{ tier: "standard", name: "Data Retention & Deletion Standard", purpose: "Retention periods, legal-hold handling, and defensible deletion evidence." }],
  "CTL-PRI-001": [{ tier: "policy", name: "Privacy Policy", purpose: "Lawful basis, notice obligations, and rights-handling commitments." }, { tier: "procedure", name: "Data Subject Request Procedure", purpose: "Intake, verification, fulfillment, and statutory-timeline tracking for DSRs." }],
  "CTL-TPR-001": [{ tier: "policy", name: "Third-Party Risk Management Policy", purpose: "Due-diligence requirements and risk-based assessment cadence." }],
  "CTL-TPR-002": [{ tier: "standard", name: "Vendor Contract Security Standard", purpose: "Required security, privacy, breach, and audit clauses; DPA obligations." }],
  "CTL-TPR-003": [{ tier: "procedure", name: "Ongoing Vendor Monitoring Procedure", purpose: "Annual review cadence, monitoring scope, and finding remediation." }],
  "CTL-PCI-001": [{ tier: "standard", name: "PCI Scope & Segmentation Standard", purpose: "CDE definition, segmentation requirements, and annual scope validation." }],
  "CTL-AI-001":  [{ tier: "policy", name: "AI Use Policy", purpose: "Approved AI use cases, inventory requirements, and ownership accountability." }, { tier: "charter", name: "AI Governance Committee Charter", purpose: "Mandate, scope, membership, and decision authority for AI oversight." }],
  "CTL-AI-002":  [{ tier: "standard", name: "AI Data-Handling Standard", purpose: "No-train terms, data residency, and sensitivity controls for AI systems." }],
  "CTL-AI-003":  [{ tier: "guideline", name: "AI Human Validation Guideline", purpose: "Where AI output requires human review and how reviewer accountability is recorded." }],
  "CTL-BIA-001": [{ tier: "procedure", name: "Business Impact Analysis Procedure", purpose: "How critical processes are identified, rated, and translated to RTO/RPO." }],
  "CTL-RES-SITE-001": [{ tier: "standard", name: "Site Resilience Standard", purpose: "Redundancy, replication, and failover requirements for critical systems." }],
  "CTL-RES-COMM-001": [{ tier: "procedure", name: "Crisis Communication Procedure", purpose: "Activation triggers, channels, contact trees, and notification testing." }],
  "CTL-RES-PWR-001": [{ tier: "standard", name: "Site Power & Connectivity Standard", purpose: "UPS, generator, and redundant-connectivity requirements at critical sites." }],
  "CTL-RES-ROLE-001": [{ tier: "charter", name: "Business Continuity / Crisis Management Charter", purpose: "Recovery roles, succession, decision authority, and activation scope." }],
  "CTL-RES-EX-001": [{ tier: "procedure", name: "DR/BCP Exercise Procedure", purpose: "Exercise cadence, scenarios, RTO/RPO validation, and remediation tracking." }],
};

/* ===== END KNOWLEDGE LIBRARY ===== */
