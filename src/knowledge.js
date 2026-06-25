/* ===== INLINED KNOWLEDGE LIBRARY ===== */
export const LIBRARY_VERSION = "0.4.0";

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
    frameworks: ["SOX ITGC: Change Management", "PCI DSS 4.0.1: Req 6.5", "NIST CSF 2.0: PR.PS-01", "ISO 27001:2022: A.8.32"],
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
    frameworks: ["SOX ITGC: Logical Access", "PCI DSS 4.0.1: Req 7", "NIST CSF 2.0: PR.AA-01", "ISO 27001:2022: A.5.15"],
  },
  "RSK-CYB-IDM-002": {
    id: "RSK-CYB-IDM-002", domain: "Cybersecurity", class: "Authentication",
    title: "Weak authentication enables account compromise",
    statement: "The system permits weak authentication (no MFA, weak password policy, shared accounts), allowing credential-based compromise of sensitive functions or data.",
    inherent: "High",
    controls: ["CTL-IAM-002", "CTL-IAM-004"],
    frameworks: ["PCI DSS 4.0.1: Req 8.3-8.4", "NIST CSF 2.0: PR.AA-03", "ISO 27001:2022: A.5.17", "NIST 800-53 Rev5: IA-2"],
  },
  "RSK-CYB-LOG-001": {
    id: "RSK-CYB-LOG-001", domain: "Cybersecurity", class: "Logging & Monitoring",
    title: "Inadequate logging prevents detection of malicious activity",
    statement: "Security-relevant events are not logged, retained, or monitored, leaving compromise and insider misuse undetected and unprovable to auditors.",
    inherent: "Medium",
    controls: ["CTL-LOG-001", "CTL-LOG-002"],
    frameworks: ["PCI DSS 4.0.1: Req 10", "NIST CSF 2.0: DE.CM-01", "ISO 27001:2022: A.8.15", "NIST 800-53 Rev5: AU-2"],
  },
  "RSK-DSP-ENC-001": {
    id: "RSK-DSP-ENC-001", domain: "Data Security & Privacy", class: "Encryption",
    title: "Sensitive data exposed in transit or at rest",
    statement: "Sensitive or regulated data is stored or transmitted without adequate encryption, exposing it to interception or unauthorized access.",
    inherent: "High",
    controls: ["CTL-ENC-001", "CTL-ENC-002"],
    frameworks: ["PCI DSS 4.0.1: Req 3-4", "NIST CSF 2.0: PR.DS-01/02", "ISO 27001:2022: A.8.24"],
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
    frameworks: ["PCI DSS 4.0.1: Req 12.8", "NIST CSF 2.0: GV.SC-01", "SOX ITGC: Outsourced Services", "ISO 27001:2022: A.5.19"],
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
    frameworks: ["PCI DSS 4.0.1: Scoping & Segmentation", "PCI DSS 4.0.1: Req 1", "PCI DSS 4.0.1: Req 12.5"],
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
    frameworks: ["NIST CSF 2.0: PR.IR-04", "ISO 22301: Clause 8.4.4", "PCI DSS 4.0.1: Req 12.10.1"],
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

/* ---------------------------------------------------------------------------
 * CONVERGENCE REGISTER
 *
 * Cross-domain cascade pathways: where a GRC-owned spine failure becomes a
 * failure in a domain owned by another function. GRC's job is to prevent or
 * detect the spine failure and flag the convergence event — never to own
 * the downstream risk itself.
 *
 * Structure mirrors the broader ecosystem's Convergence Register (CNV-NNN).
 * ------------------------------------------------------------------------- */

export const CONVERGENCE = [
  {
    id: "CNV-001",
    spineRisk: "RSK-TEC-AVL-001",
    spineLabel: "System availability failure",
    impactDomain: "Operations / Revenue",
    impact: "Extended system outage halts revenue-generating processes; customer-facing services go dark, triggering SLA penalties and reputational damage.",
    chain: ["System availability failure", "Dependent business processes stall", "Revenue loss and customer impact"],
  },
  {
    id: "CNV-002",
    spineRisk: "RSK-TEC-CHG-001",
    spineLabel: "Uncontrolled change to production",
    impactDomain: "Operations / Safety",
    impact: "Failed or unauthorized change cascades into production outage or data corruption, potentially affecting safety-critical monitoring systems.",
    chain: ["Change failure in production", "System instability or data corruption", "Operational disruption or safety monitoring gap"],
  },
  {
    id: "CNV-003",
    spineRisk: "RSK-CYB-IDM-001",
    spineLabel: "Access lifecycle failure",
    impactDomain: "Financial / Legal",
    impact: "Excessive or orphaned access enables unauthorized transactions, data exfiltration, or fraud — creating financial loss and legal liability.",
    chain: ["Access not revoked or over-provisioned", "Unauthorized action or data access", "Financial loss or regulatory finding"],
  },
  {
    id: "CNV-004",
    spineRisk: "RSK-DSP-PRI-001",
    spineLabel: "Privacy program failure",
    impactDomain: "Legal / Regulatory",
    impact: "Unlawful processing or unhandled data subject requests triggers regulatory enforcement, fines, and class-action litigation risk.",
    chain: ["Privacy control gap", "Personal data mishandled", "Regulatory enforcement and reputational harm"],
  },
  {
    id: "CNV-005",
    spineRisk: "RSK-TPR-SUP-001",
    spineLabel: "Vendor due-diligence gap",
    impactDomain: "Operations / Compliance",
    impact: "Unassessed vendor introduces unquantified risk into the supply chain; a vendor incident becomes the organization's incident with no contractual remedies.",
    chain: ["Vendor onboarded without due diligence", "Vendor security or resilience failure", "Organization inherits impact with no contractual protection"],
  },
  {
    id: "CNV-006",
    spineRisk: "RSK-TPR-DR-001",
    spineLabel: "Vendor resilience not validated",
    impactDomain: "Operations",
    impact: "Critical vendor outage with no tested recovery path; organization discovers the gap only during an actual disruption.",
    chain: ["No vendor DR evidence collected", "Vendor suffers outage", "Organization has no failover and no contractual RTO"],
  },
  {
    id: "CNV-007",
    spineRisk: "RSK-DSP-ENC-001",
    spineLabel: "Encryption controls inadequate",
    impactDomain: "Financial / Reputational",
    impact: "Data breach from weak or missing encryption exposes customer records, triggering breach notification costs, fines, and loss of trust.",
    chain: ["Encryption at rest or in transit insufficient", "Data exfiltrated in readable form", "Breach notification, fines, customer attrition"],
  },
  {
    id: "CNV-008",
    spineRisk: "RSK-CMP-PCI-001",
    spineLabel: "PCI scope misidentified",
    impactDomain: "Financial / Regulatory",
    impact: "Cardholder data environment extends beyond assessed scope; unprotected systems process card data, leading to compromise and acquirer penalties.",
    chain: ["PCI scope underestimated", "Cardholder data processed outside controls", "Compromise, fines, and potential loss of processing rights"],
  },
  {
    id: "CNV-009",
    spineRisk: "RSK-AI-GOV-001",
    spineLabel: "AI system ungoverned",
    impactDomain: "Reputational / Legal",
    impact: "Ungoverned AI output drives a customer-facing decision that causes harm; no audit trail exists to demonstrate human oversight or model validation.",
    chain: ["AI deployed without inventory or risk tier", "Harmful or biased output reaches customers", "Regulatory action and reputational damage"],
  },
  {
    id: "CNV-010",
    spineRisk: "RSK-RES-DRP-001",
    spineLabel: "DR plan untested or absent",
    impactDomain: "Operations / Financial",
    impact: "Disaster recovery plan fails during an actual incident; outage extends well beyond stated RTO, causing revenue loss and contract breaches.",
    chain: ["DR plan not tested or gaps not remediated", "Actual disaster occurs", "Recovery exceeds RTO; contracts breached, revenue lost"],
  },
];

/* ---------------------------------------------------------------------------
 * SCF 2026.1 — SECURE CONTROLS FRAMEWORK CROSS-REFERENCE
 *
 * Maps our curated CTL-* controls to their SCF equivalents, with domain
 * metadata. The SCF is the interoperability layer — 1,468 controls across
 * 33 domains, with 25,000+ framework mappings to NIST, PCI, ISO, etc.
 * ------------------------------------------------------------------------- */

export const SCF_VERSION = "2026.1";

export const SCF_DOMAINS = [
  { name: "Security, Compliance & Resilience Governance", id: "GOV", count: 38 },
  { name: "Artificial Intelligence & Autonomous Technologies", id: "AAT", count: 156 },
  { name: "Asset Management", id: "AST", count: 63 },
  { name: "Business Continuity & Disaster Recovery", id: "BCD", count: 59 },
  { name: "Capacity & Performance Planning", id: "CAP", count: 6 },
  { name: "Change Management", id: "CHG", count: 19 },
  { name: "Embedded Technology", id: "EMB", count: 20 },
  { name: "Cloud Security", id: "CLD", count: 24 },
  { name: "Compliance", id: "CPL", count: 40 },
  { name: "Configuration Management", id: "CFG", count: 28 },
  { name: "Continuous Monitoring", id: "MON", count: 71 },
  { name: "Cryptographic Protections", id: "CRY", count: 29 },
  { name: "Data Classification & Handling", id: "DCH", count: 85 },
  { name: "Endpoint Security", id: "END", count: 47 },
  { name: "Human Resources Security", id: "HRS", count: 46 },
  { name: "Identification & Authentication", id: "IAC", count: 114 },
  { name: "Incident Response", id: "IRO", count: 44 },
  { name: "Information Assurance", id: "IAO", count: 15 },
  { name: "Maintenance", id: "MNT", count: 28 },
  { name: "Mobile Device Management", id: "MDM", count: 11 },
  { name: "Network Security", id: "NET", count: 98 },
  { name: "Physical & Environmental Security", id: "PES", count: 51 },
  { name: "Data Privacy", id: "PRI", count: 102 },
  { name: "Project & Resource Management", id: "PRM", count: 11 },
  { name: "Risk Management", id: "RSK", count: 32 },
  { name: "Secure Engineering & Architecture", id: "SEA", count: 44 },
  { name: "Security Operations", id: "OPS", count: 8 },
  { name: "Security Awareness & Training", id: "SAT", count: 17 },
  { name: "Technology Development & Acquisition", id: "TDA", count: 70 },
  { name: "Third-Party Management", id: "TPM", count: 31 },
  { name: "Threat Management", id: "THR", count: 13 },
  { name: "Vulnerability & Patch Management", id: "VPM", count: 33 },
  { name: "Web Security", id: "WEB", count: 15 },
];

export const SCF_CONTROLS = {
  "AAT-01":  { id: "AAT-01",  domain: "Artificial Intelligence & Autonomous Technologies", title: "AI & Autonomous Technologies Governance", desc: "Policies, processes and procedures for mapping, measuring and managing AI-related risks." },
  "AAT-02":  { id: "AAT-02",  domain: "Artificial Intelligence & Autonomous Technologies", title: "Situational Awareness of AI & Autonomous Technologies", desc: "Develop and maintain an inventory of AI and Autonomous Technologies deployed across the organization." },
  "AAT-09":  { id: "AAT-09",  domain: "Artificial Intelligence & Autonomous Technologies", title: "AI & Autonomous Technologies Risk Profile", desc: "Define risk profiles for AI systems including impact assessments and human oversight requirements." },
  "AAT-14":  { id: "AAT-14",  domain: "Artificial Intelligence & Autonomous Technologies", title: "AI & Autonomous Technologies Requirements", desc: "Data privacy and security requirements specific to AI system training data and outputs." },
  "BCD-01":  { id: "BCD-01",  domain: "Business Continuity & Disaster Recovery", title: "Business Continuity Management System (BCMS)", desc: "Facilitate the implementation of contingency planning controls for resilient operations." },
  "BCD-02":  { id: "BCD-02",  domain: "Business Continuity & Disaster Recovery", title: "Identify Critical Assets", desc: "Identify and document critical technology assets, applications, services and data that support essential missions." },
  "BCD-04":  { id: "BCD-04",  domain: "Business Continuity & Disaster Recovery", title: "Contingency Plan Testing & Exercises", desc: "Conduct tests and exercises to evaluate contingency plan effectiveness and organizational readiness." },
  "BCD-08":  { id: "BCD-08",  domain: "Business Continuity & Disaster Recovery", title: "Alternate Communications", desc: "Establish alternate communication capabilities to support incident coordination and operations." },
  "BCD-11":  { id: "BCD-11",  domain: "Business Continuity & Disaster Recovery", title: "Data Backups", desc: "Conduct system-level and user-level backups of data in accordance with defined policies." },
  "BCD-11.1":{ id: "BCD-11.1",domain: "Business Continuity & Disaster Recovery", title: "Testing for Reliability & Integrity", desc: "Test backup information to verify media reliability and information integrity at defined intervals." },
  "BCD-12":  { id: "BCD-12",  domain: "Business Continuity & Disaster Recovery", title: "Alternate Processing / Storage Site", desc: "Establish alternate processing and storage sites with equivalent safeguards to the primary site." },
  "BCD-13":  { id: "BCD-13",  domain: "Business Continuity & Disaster Recovery", title: "Backup & Restoration Hardware Protection", desc: "Protect backup and restoration hardware, firmware and software from unauthorized access and modification." },
  "CHG-01":  { id: "CHG-01",  domain: "Change Management", title: "Change Management Program", desc: "Facilitate the implementation of a change management program governing all technology changes." },
  "CHG-02":  { id: "CHG-02",  domain: "Change Management", title: "Configuration Change Control", desc: "Govern the technical configuration change control processes including emergency changes." },
  "CHG-03":  { id: "CHG-03",  domain: "Change Management", title: "Security Impact Analysis for Changes", desc: "Analyze proposed changes for potential security impacts prior to implementation." },
  "CHG-06":  { id: "CHG-06",  domain: "Change Management", title: "Control Functionality Verification", desc: "Verify control functionality after changes to ensure security controls remain effective." },
  "CPL-01":  { id: "CPL-01",  domain: "Compliance", title: "Statutory, Regulatory & Contractual Compliance", desc: "Identify and implement relevant statutory, regulatory and contractual compliance obligations." },
  "CRY-01":  { id: "CRY-01",  domain: "Cryptographic Protections", title: "Use of Cryptographic Controls", desc: "Implement cryptographic protections using known public standards and trusted algorithms." },
  "CRY-03":  { id: "CRY-03",  domain: "Cryptographic Protections", title: "Transmission Confidentiality", desc: "Cryptographic mechanisms to protect the confidentiality of data being transmitted." },
  "CRY-04":  { id: "CRY-04",  domain: "Cryptographic Protections", title: "Transmission Integrity", desc: "Cryptographic mechanisms to protect the integrity of data being transmitted." },
  "CRY-05":  { id: "CRY-05",  domain: "Cryptographic Protections", title: "Encrypting Data At Rest", desc: "Cryptographic mechanisms to prevent unauthorized disclosure of data at rest." },
  "DCH-01":  { id: "DCH-01",  domain: "Data Classification & Handling", title: "Data Protection", desc: "Facilitate the implementation of data protection controls throughout the data lifecycle." },
  "DCH-02":  { id: "DCH-02",  domain: "Data Classification & Handling", title: "Data & Asset Classification", desc: "Categorize data and assets in accordance with applicable statutory, regulatory and contractual requirements." },
  "DCH-17":  { id: "DCH-17",  domain: "Data Classification & Handling", title: "Ad-Hoc Transfers", desc: "Govern the secure transfer and disposal of data including retention period enforcement." },
  "IAC-01":  { id: "IAC-01",  domain: "Identification & Authentication", title: "Identity & Access Management (IAM)", desc: "Facilitate the implementation of identification and access management controls." },
  "IAC-06":  { id: "IAC-06",  domain: "Identification & Authentication", title: "Multi-Factor Authentication (MFA)", desc: "Enforce multi-factor authentication for access to systems and applications." },
  "IAC-09":  { id: "IAC-09",  domain: "Identification & Authentication", title: "Identifier Management (User Names)", desc: "Manage user identifiers including creation, assignment, review and revocation." },
  "IAC-10":  { id: "IAC-10",  domain: "Identification & Authentication", title: "Authenticator Management", desc: "Manage authenticators including initial distribution, lost/stolen replacement and revocation." },
  "IAC-21":  { id: "IAC-21",  domain: "Identification & Authentication", title: "Least Privilege", desc: "Employ the principle of least privilege, allowing only authorized access necessary for assigned tasks." },
  "MON-01":  { id: "MON-01",  domain: "Continuous Monitoring", title: "Continuous Monitoring", desc: "Facilitate the implementation of enterprise-wide monitoring controls." },
  "MON-02":  { id: "MON-02",  domain: "Continuous Monitoring", title: "Centralized Collection of Security Events", desc: "Utilize a SIEM or similar tool to support centralized collection of security event logs." },
  "MON-03":  { id: "MON-03",  domain: "Continuous Monitoring", title: "Content of Event Logs", desc: "Configure systems to produce event logs that contain sufficient detail for forensic analysis." },
  "MON-06":  { id: "MON-06",  domain: "Continuous Monitoring", title: "Monitoring Reporting", desc: "Report monitoring findings to appropriate personnel for timely response." },
  "PRI-01":  { id: "PRI-01",  domain: "Data Privacy", title: "Data Privacy Program", desc: "Facilitate the implementation of data protection controls throughout the data lifecycle." },
  "PRI-03":  { id: "PRI-03",  domain: "Data Privacy", title: "Choice & Consent", desc: "Enable data subjects to authorize collection, processing, storage and sharing of personal data." },
  "TPM-01":  { id: "TPM-01",  domain: "Third-Party Management", title: "Third-Party Management", desc: "Facilitate the implementation of third-party management controls." },
  "TPM-02":  { id: "TPM-02",  domain: "Third-Party Management", title: "Third-Party Criticality Assessments", desc: "Identify, prioritize and assess suppliers and partners of critical technology assets and services." },
  "TPM-04":  { id: "TPM-04",  domain: "Third-Party Management", title: "Third-Party Services", desc: "Mitigate risks associated with third-party access to organization technology assets." },
  "TPM-05":  { id: "TPM-05",  domain: "Third-Party Management", title: "Third-Party Contract Requirements", desc: "Require contractual security, compliance and resilience requirements with third-party providers." },
  "TPM-08":  { id: "TPM-08",  domain: "Third-Party Management", title: "Review of Third-Party Services", desc: "Review third-party provided services for compliance with contractual and regulatory requirements." },
};

export const SCF_MAPPING = {
  "CTL-CHG-001": ["CHG-01", "CHG-02"],
  "CTL-CHG-002": ["CHG-03", "CHG-06"],
  "CTL-CHG-003": ["CHG-02"],
  "CTL-AVL-001": ["BCD-11", "BCD-11.1"],
  "CTL-AVL-002": ["MON-01", "MON-02"],
  "CTL-DR-001":  ["BCD-04", "BCD-01"],
  "CTL-DR-002":  ["TPM-04", "BCD-02"],
  "CTL-IAM-001": ["IAC-01", "IAC-06"],
  "CTL-IAM-002": ["IAC-10"],
  "CTL-IAM-003": ["IAC-21"],
  "CTL-IAM-004": ["IAC-09"],
  "CTL-LOG-001": ["MON-01", "MON-02"],
  "CTL-LOG-002": ["MON-06", "MON-03"],
  "CTL-ENC-001": ["CRY-01", "CRY-05"],
  "CTL-ENC-002": ["CRY-03", "CRY-04"],
  "CTL-DAT-001": ["DCH-01", "DCH-02"],
  "CTL-DAT-002": ["DCH-17"],
  "CTL-PRI-001": ["PRI-01", "PRI-03"],
  "CTL-TPR-001": ["TPM-01", "TPM-02"],
  "CTL-TPR-002": ["TPM-05"],
  "CTL-TPR-003": ["TPM-04", "TPM-08"],
  "CTL-PCI-001": ["CPL-01"],
  "CTL-AI-001":  ["AAT-01", "AAT-02"],
  "CTL-AI-002":  ["AAT-14"],
  "CTL-AI-003":  ["AAT-09"],
  "CTL-BIA-001":       ["BCD-02"],
  "CTL-RES-SITE-001":  ["BCD-12"],
  "CTL-RES-COMM-001":  ["BCD-08"],
  "CTL-RES-PWR-001":   ["BCD-13"],
  "CTL-RES-ROLE-001":  ["BCD-01"],
  "CTL-RES-EX-001":    ["BCD-04"],
};

/* ---------------------------------------------------------------------------
 * BUSINESS IMPACT ANALYSIS (Phase 2)
 * Per-archetype impact profile across the six standard BIA dimensions. Each
 * dimension carries a rating on the same Low/Medium/High/Critical scale used
 * everywhere else and a one-line rationale grounded in that archetype's
 * reality. The engine takes the WORST CASE per dimension across the active
 * archetypes, so a multi-pattern initiative inherits the most severe framing.
 * Deterministic and inspectable — not the model guessing impact.
 * ------------------------------------------------------------------------- */
export const BIA_DIMENSIONS = [
  { id: "revenue",     label: "Revenue" },
  { id: "operational", label: "Operational" },
  { id: "regulatory",  label: "Regulatory" },
  { id: "customer",    label: "Customer" },
  { id: "reputation",  label: "Reputation" },
  { id: "strategic",   label: "Strategic" },
];

export const BIA_PROFILES = {
  "saas-financial": {
    revenue:     { rating: "High",     note: "ERP errors flow directly into billing, revenue recognition, and financial reporting." },
    operational: { rating: "High",     note: "Core back-office processes — close, payroll, procurement — depend on the system." },
    regulatory:  { rating: "Critical", note: "In SOX financial-reporting scope; ITGC failures are reportable deficiencies." },
    customer:    { rating: "Medium",   note: "Mostly internal, but invoicing and payment errors surface to customers." },
    reputation:  { rating: "Medium",   note: "Restatement or payroll failure erodes trust with investors, auditors, and staff." },
    strategic:   { rating: "Medium",   note: "The finance platform choice shapes the operating model for years." },
  },
  "payments": {
    revenue:     { rating: "Critical", note: "Loss of card-acceptance ability or a CDE breach directly halts payment revenue." },
    operational: { rating: "High",     note: "Point-of-sale and checkout outages stop transactions at the register." },
    regulatory:  { rating: "Critical", note: "PCI DSS obligations and breach-notification laws apply; fines and acquirer penalties follow." },
    customer:    { rating: "High",     note: "Cardholders are directly exposed; fraud and breach destroy purchase confidence." },
    reputation:  { rating: "Critical", note: "A card breach is highly public and brand-defining." },
    strategic:   { rating: "Medium",   note: "Processor and acquirer relationships are long-term and costly to switch." },
  },
  "ai-genai": {
    revenue:     { rating: "Medium",   note: "Revenue impact is indirect unless the AI feature is itself monetized." },
    operational: { rating: "Medium",   note: "Failure degrades an assistive feature rather than halting core operations." },
    regulatory:  { rating: "High",     note: "EU AI Act, privacy law, and sector rules apply to automated decisions and training data." },
    customer:    { rating: "High",     note: "Customer-facing AI output that is wrong, biased, or harmful reaches users directly." },
    reputation:  { rating: "High",     note: "AI failures are highly visible and attract disproportionate scrutiny." },
    strategic:   { rating: "High",     note: "AI adoption is a board-level strategic bet on capability and differentiation." },
  },
  "vendor-saas-general": {
    revenue:     { rating: "Medium",   note: "Revenue exposure depends on how business-critical the hosted app is." },
    operational: { rating: "High",     note: "Operations depend on a service the organization does not control." },
    regulatory:  { rating: "Medium",   note: "Regulatory exposure depends on the data the vendor processes." },
    customer:    { rating: "Medium",   note: "Customer impact is indirect, via the vendor's service quality." },
    reputation:  { rating: "Medium",   note: "A vendor incident becomes the organization's incident in customers' eyes." },
    strategic:   { rating: "Medium",   note: "Vendor lock-in and concentration shape future flexibility." },
  },
  "data-platform": {
    revenue:     { rating: "Medium",   note: "Analytics inform revenue decisions but rarely transact directly." },
    operational: { rating: "Medium",   note: "Downstream reporting and decisions stall if the platform fails." },
    regulatory:  { rating: "High",     note: "Aggregating regulated and personal data at scale concentrates privacy and retention obligations." },
    customer:    { rating: "High",     note: "A breach of aggregated customer data has broad, direct customer impact." },
    reputation:  { rating: "High",     note: "Large-scale data exposure is brand-defining and widely reported." },
    strategic:   { rating: "High",     note: "The data platform is foundational to analytics and AI strategy." },
  },
  "infra-change": {
    revenue:     { rating: "High",     note: "A failed migration or network change can take revenue-generating systems offline." },
    operational: { rating: "Critical", note: "Core platform changes can disrupt every dependent system at once." },
    regulatory:  { rating: "Medium",   note: "Indirect, unless the change moves regulated data or affects in-scope systems." },
    customer:    { rating: "High",     note: "Customer-facing services ride on the infrastructure being changed." },
    reputation:  { rating: "Medium",   note: "A botched cutover that causes visible downtime draws negative attention." },
    strategic:   { rating: "High",     note: "Platform and cloud architecture decisions are long-horizon and hard to reverse." },
  },
  "site-outage": {
    revenue:     { rating: "Critical", note: "A site going dark halts revenue at every affected location immediately." },
    operational: { rating: "Critical", note: "Loss of a site stops the operations that run from it until recovery." },
    regulatory:  { rating: "Medium",   note: "Resilience and continuity expectations apply; safety-system loss may carry obligations." },
    customer:    { rating: "High",     note: "Customers at affected locations lose service entirely during the outage." },
    reputation:  { rating: "High",     note: "Visible inability to operate or recover damages confidence in the brand." },
    strategic:   { rating: "Medium",   note: "Demonstrated resilience — or its absence — shapes long-term continuity posture." },
  },
};

/* ---------------------------------------------------------------------------
 * MATURITY MODEL
 * The standard five-level capability ladder, evaluated per GRC domain in scope.
 * `current` is a clearly-labeled BASELINE ASSUMPTION for a new or un-governed
 * initiative — the starting point before the recommended controls exist.
 * `target` is the curated maturity the control set is designed to reach.
 * Keyed by the risk `domain` values so the in-scope domains fall out of the
 * assessment automatically.
 * ------------------------------------------------------------------------- */
export const MATURITY_LEVELS = [
  { level: 1, label: "Ad Hoc" },
  { level: 2, label: "Repeatable" },
  { level: 3, label: "Defined" },
  { level: 4, label: "Managed" },
  { level: 5, label: "Optimized" },
];

export const MATURITY_PROFILES = {
  "Technology": { current: 1, target: 3,
    currentNote: "Change and recovery handled reactively, case by case, with little documentation.",
    targetNote:  "Change, availability, and recovery controls are documented, tested, and consistently followed." },
  "Cybersecurity": { current: 1, target: 4,
    currentNote: "Access and monitoring depend on individual effort and tribal knowledge.",
    targetNote:  "Identity, authentication, and logging controls are standardized and centrally monitored." },
  "Data Security & Privacy": { current: 1, target: 3,
    currentNote: "Data is handled without consistent classification, encryption, or retention discipline.",
    targetNote:  "Classification, encryption, and retention are policy-driven and applied by default." },
  "Third-Party Risk": { current: 1, target: 3,
    currentNote: "Vendors are onboarded on trust, without consistent due diligence or monitoring.",
    targetNote:  "Vendors are risk-tiered, assessed at onboarding, and monitored on a defined cadence." },
  "Compliance": { current: 2, target: 4,
    currentNote: "Compliance is addressed at audit time rather than maintained continuously.",
    targetNote:  "Control evidence is produced as a by-product of operations and continuously monitored." },
  "AI Governance": { current: 1, target: 3,
    currentNote: "AI is adopted ad hoc, without inventory, risk-tiering, or named ownership.",
    targetNote:  "AI systems are inventoried, risk-classified, and governed with human oversight." },
};

/* ---------------------------------------------------------------------------
 * AUDIT READINESS DEPTH (Phase 6)
 * For each control: the questions an auditor would actually ask, and the
 * common findings that surface when the control is weak. Kept separate from
 * CONTROLS and CONTROL_PROCEDURES so the base library stays lean and this
 * audit layer can be versioned independently.
 * ------------------------------------------------------------------------- */
export const CONTROL_AUDIT = {
  "CTL-CHG-001": { questions: ["Who approves changes, and is approval enforced before deployment?", "How is segregation between the developer and the approver enforced in the change tool?"],
    findings: ["Approver and implementer are the same person on a sampled change.", "Approval was recorded after the change was already in production."] },
  "CTL-CHG-002": { questions: ["Where is testing performed, and is non-production evidence retained with the change record?", "Can you show test results for a sampled production change?"],
    findings: ["Changes released without documented test evidence attached.", "Testing performed in production because no non-prod environment exists."] },
  "CTL-CHG-003": { questions: ["What defines an emergency change, and what is the retrospective-approval SLA?", "Show emergency changes from the period and their retrospective approvals."],
    findings: ["Emergency path used to bypass normal approval for routine changes.", "Retrospective approval never completed within the defined window."] },
  "CTL-AVL-001": { questions: ["How often are backups taken, and when was restoration last tested?", "Can you produce evidence of a successful restore test?"],
    findings: ["Backups run but restoration has never been tested.", "A restore test failed and the gap was not remediated."] },
  "CTL-AVL-002": { questions: ["What thresholds trigger alerts, and where do they route?", "Show a recent threshold breach and the response it generated."],
    findings: ["Alerts configured but routed to an unmonitored mailbox.", "No defined thresholds — monitoring is observational only."] },
  "CTL-DR-001": { questions: ["What are the documented RTO/RPO, and when was the plan last tested?", "Show the most recent DR test report and the gaps it logged."],
    findings: ["DR runbook exists but has never been exercised.", "Test did not meet the stated RTO and no remediation was tracked."] },
  "CTL-DR-002": { questions: ["Which critical vendors have provided DR evidence in the last year?", "Show a vendor DR attestation or a SOC 2 with DR scope on file."],
    findings: ["Critical vendor has no DR evidence on file.", "Vendor RTO/RPO commitments are not recorded in any register."] },
  "CTL-IAM-001": { questions: ["How is access requested and approved before it is granted?", "For a sampled user, show the approval and the role basis for their access."],
    findings: ["Access granted without documented manager approval.", "User access exceeds what their role requires — not least-privilege."] },
  "CTL-IAM-002": { questions: ["Where is MFA enforced, and what exceptions exist?", "Show authentication logs evidencing the MFA challenge for in-scope access."],
    findings: ["MFA not enforced for remote or privileged access.", "Standing MFA exceptions exist with no expiry or review."] },
  "CTL-IAM-003": { questions: ["What is the review cadence, and who attests to it?", "Show the most recent completed review and the revocations it drove."],
    findings: ["Access review completed but flagged access was never revoked.", "Review lacks reviewer attestation, date, or version."] },
  "CTL-IAM-004": { questions: ["What authentication parameters are enforced, and how are shared accounts handled?", "Show the password configuration and PAM records for service accounts."],
    findings: ["Shared or service accounts used without vaulting.", "Password configuration weaker than the in-force standard."] },
  "CTL-LOG-001": { questions: ["Which security events are logged, and how are logs protected from tampering?", "Show sample log entries covering key security events."],
    findings: ["Key security events such as auth and privilege change are not logged.", "Logs are writable by the same admins they are meant to monitor."] },
  "CTL-LOG-002": { questions: ["What alert rules exist, and how are alerts triaged daily?", "Show a sampled alert through to triage and escalation."],
    findings: ["Alerts generated but never triaged.", "No SIEM correlation — review is manual and inconsistent."] },
  "CTL-ENC-001": { questions: ["What algorithm protects data at rest, and how are keys managed?", "Show the encryption-at-rest configuration for the in-scope store."],
    findings: ["Sensitive data stored unencrypted at rest.", "Encryption keys stored alongside the data they protect."] },
  "CTL-ENC-002": { questions: ["What TLS version is enforced, and are weak protocols disabled?", "Show a scan confirming weak protocols and ciphers are disabled."],
    findings: ["Legacy TLS or plaintext protocols still permitted.", "Internal traffic transmitted without encryption."] },
  "CTL-DAT-001": { questions: ["How is the data classified, and what handling rules follow from it?", "Show the classification and matching handling for a sampled data set."],
    findings: ["Data is not classified, so handling is inconsistent.", "Handling does not match the assigned classification."] },
  "CTL-DAT-002": { questions: ["What is the retention schedule, and how is deletion evidenced?", "Show deletion logs for data past its retention period."],
    findings: ["Data retained indefinitely with no schedule.", "No defensible, logged deletion process; legal holds undocumented."] },
  "CTL-PRI-001": { questions: ["What is the lawful basis, and how are data-subject requests handled within statutory timelines?", "Show a sampled DSR fulfilled within the required timeframe."],
    findings: ["No records of processing or privacy notice for the activity.", "DSRs handled ad hoc and missed statutory deadlines."] },
  "CTL-TPR-001": { questions: ["What assessment is performed before onboarding, and on what re-assessment cadence?", "Show a completed due-diligence assessment for a sampled vendor."],
    findings: ["Vendor onboarded with no security assessment.", "Re-assessment overdue for a critical vendor."] },
  "CTL-TPR-002": { questions: ["What security, privacy, breach, and audit clauses are required in contracts?", "Show an executed contract with the required clauses and a DPA where applicable."],
    findings: ["Contract lacks breach-notification or right-to-audit clauses.", "No DPA in place despite personal-data processing."] },
  "CTL-TPR-003": { questions: ["What is monitored for critical vendors, and how often are they reviewed?", "Show the most recent annual review and findings log for a vendor."],
    findings: ["No monitoring after onboarding.", "Annual review overdue; findings not tracked to closure."] },
  "CTL-PCI-001": { questions: ["How is the CDE defined and segmented, and when was scope last validated?", "Show data-flow diagrams and segmentation test results."],
    findings: ["CDE scope not validated within the last year.", "Segmentation assumed but never penetration-tested."] },
  "CTL-AI-001": { questions: ["Is the AI system in the inventory with a risk tier and a named owner?", "Show the inventory entry predating production use."],
    findings: ["AI system in production but absent from any inventory.", "No risk classification or accountable owner assigned."] },
  "CTL-AI-002": { questions: ["What no-train, retention, and residency terms govern data sent to the AI system?", "Show the data-handling agreement or configuration evidencing them."],
    findings: ["Data sent to the AI with no no-training-use guarantee.", "No DPIA where personal data is processed by the model."] },
  "CTL-AI-003": { questions: ["Where is human validation required before AI output is used or acted on?", "Show reviewer attestation for a sampled AI-assisted output."],
    findings: ["AI output used in decisions with no human review.", "No disclosure of AI assistance where it is required."] },
  "CTL-BIA-001": { questions: ["When was the BIA last reviewed, and does it set RTO/RPO per critical process?", "Show the BIA with criticality ratings and dependency mapping."],
    findings: ["No current BIA; recovery priorities are undefined.", "BIA exists but omits RTO/RPO or dependency mapping."] },
  "CTL-RES-SITE-001": { questions: ["Can critical systems run from a redundant site, and is data replicated off the primary?", "Show evidence of a successful failover or recovery test."],
    findings: ["Single-site dependency with no failover capability.", "Replication configured but failover never tested."] },
  "CTL-RES-COMM-001": { questions: ["How are staff, customers, responders, and vendors reached during an outage?", "Show the contact-tree currency and a notification test result."],
    findings: ["No tested mass-notification method.", "Contact tree out of date; key contacts unreachable in a test."] },
  "CTL-RES-PWR-001": { questions: ["What backup power and redundant connectivity protect critical store systems?", "Show UPS/generator test logs and a connectivity failover test."],
    findings: ["No UPS or generator; systems fail immediately on power loss.", "Single network path with no failover connectivity."] },
  "CTL-RES-ROLE-001": { questions: ["Who is the incident commander, and what is the succession and on-call coverage?", "Show role coverage from the most recent exercise or activation."],
    findings: ["Recovery roles undefined; no named incident commander.", "On-call roster stale with gaps in coverage."] },
  "CTL-RES-EX-001": { questions: ["How often are recovery plans exercised, and against what RTO/RPO?", "Show the most recent exercise report and its remediation tracking."],
    findings: ["Plans documented but never exercised.", "Exercise gaps logged but not tracked to closure."] },
};

/* ---------------------------------------------------------------------------
 * FRAMEWORK REFERENCE LIBRARY
 * Registry of the governance frameworks and regulations the engine references.
 * Each entry carries version, publisher, and a one-line paraphrased summary
 * (never verbatim standard text). kind: "framework" | "regulation".
 * aliases: the citation prefixes that appear in risk.frameworks strings.
 * ------------------------------------------------------------------------- */
export const FRAMEWORKS = {
  "SOX-ITGC": {
    id: "SOX-ITGC", name: "SOX IT General Controls", kind: "framework",
    version: "SOX §404 / PCAOB AS 2201", publisher: "SEC / PCAOB", date: "2002 (law)",
    summary: "IT controls tested under Sarbanes-Oxley §404 to support reliable financial reporting — access, change, operations, and outsourced services.",
    note: "SOX is law, not a versioned framework. ITGCs are the control domains tested under §404, typically anchored to COBIT 2019.",
    aliases: ["SOX ITGC", "SOX 404", "SOX"],
  },
  "PCI-DSS": {
    id: "PCI-DSS", name: "PCI DSS", kind: "framework",
    version: "4.0.1", publisher: "PCI SSC", date: "2024-06",
    summary: "Payment card industry standard protecting cardholder data — 12 requirement areas covering network security, access, encryption, monitoring, and governance.",
    note: "All 2026 assessments are against v4.0.1. Future-dated requirements became mandatory 31 Mar 2025.",
    aliases: ["PCI DSS 4.0.1", "PCI DSS 4.0", "PCI DSS"],
  },
  "NIST-CSF": {
    id: "NIST-CSF", name: "NIST Cybersecurity Framework", kind: "framework",
    version: "2.0", publisher: "NIST", date: "2024-02",
    summary: "Voluntary framework organizing cybersecurity outcomes into six functions — Govern, Identify, Protect, Detect, Respond, Recover — applicable across sectors.",
    note: "Version 2.0 added the Govern function and expanded supply-chain and AI guidance.",
    aliases: ["NIST CSF 2.0", "NIST CSF"],
  },
  "NIST-80053": {
    id: "NIST-80053", name: "NIST SP 800-53", kind: "framework",
    version: "Rev. 5", publisher: "NIST", date: "2020-09 (updated 2024)",
    summary: "Comprehensive catalog of security and privacy controls for federal information systems, widely adopted as a control baseline beyond government.",
    note: "Revision 5 integrates privacy controls and is the catalog the NIST Risk Management Framework (SP 800-37) selects from.",
    aliases: ["NIST 800-53 Rev5", "NIST 800-53", "NIST SP 800-53"],
  },
  "NIST-RMF": {
    id: "NIST-RMF", name: "NIST Risk Management Framework", kind: "framework",
    version: "SP 800-37 Rev. 2", publisher: "NIST", date: "2018-12",
    summary: "Seven-step life-cycle process — Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor — for managing security and privacy risk for information systems.",
    note: "The RMF is the process that operationalizes the SP 800-53 control catalog. Rev. 2 added the Prepare step and aligned the RMF with the NIST CSF, privacy, and supply-chain risk processes.",
    aliases: ["NIST RMF", "NIST 800-37", "SP 800-37"],
  },
  "NIST-AI-RMF": {
    id: "NIST-AI-RMF", name: "NIST AI Risk Management Framework", kind: "framework",
    version: "1.0", publisher: "NIST", date: "2023-01",
    summary: "Voluntary framework for managing AI risks across the lifecycle — four functions: Govern, Map, Measure, Manage — with a Generative AI Profile (AI 600-1, 2024).",
    note: "The Generative AI Profile (NIST AI 600-1, Jul 2024) extends the core RMF with risks specific to large language models and generative systems.",
    aliases: ["NIST AI RMF"],
  },
  "ISO-27001": {
    id: "ISO-27001", name: "ISO/IEC 27001", kind: "framework",
    version: "2022", publisher: "ISO/IEC", date: "2022-10",
    summary: "International standard for establishing, implementing, and continually improving an information security management system (ISMS) — 93 Annex A controls across 4 themes.",
    note: "The 2022 edition restructured Annex A from 114 controls (14 domains) to 93 controls under Organizational, People, Physical, and Technological themes.",
    aliases: ["ISO 27001:2022", "ISO 27001"],
  },
  "ISO-42001": {
    id: "ISO-42001", name: "ISO/IEC 42001", kind: "framework",
    version: "2023", publisher: "ISO/IEC", date: "2023-12",
    summary: "International standard for an AI management system (AIMS) — requirements for responsible development, provision, and use of AI within an organization.",
    note: "First international management-system standard specifically for AI. Complementary to ISO 27001 for organizations deploying AI systems.",
    aliases: ["ISO 42001:2023", "ISO 42001"],
  },
  "ISO-22301": {
    id: "ISO-22301", name: "ISO 22301", kind: "framework",
    version: "2019", publisher: "ISO", date: "2019-10",
    summary: "International standard for a business continuity management system (BCMS) — requirements for planning, establishing, and maintaining organizational resilience.",
    note: "Clause 8 covers operational planning: BIA, risk assessment, continuity strategies, plans, and exercises.",
    aliases: ["ISO 22301"],
  },
  "COBIT": {
    id: "COBIT", name: "COBIT", kind: "framework",
    version: "2019", publisher: "ISACA", date: "2018-11",
    summary: "Governance framework for enterprise IT — 40 objectives across Evaluate/Direct/Monitor, Align/Plan/Organize, Build/Acquire/Implement, Deliver/Service/Support, and Monitor/Evaluate/Assess.",
    note: "COBIT 2019 is the anchor for SOX ITGC testing and is widely used to bridge business goals and IT controls.",
    aliases: ["COBIT 2019", "COBIT"],
  },
  "GDPR": {
    id: "GDPR", name: "General Data Protection Regulation", kind: "regulation",
    version: "Reg. (EU) 2016/679", publisher: "European Union", date: "2018-05 (effective)",
    summary: "EU regulation governing the processing of personal data — establishes lawful basis, data-subject rights, breach notification, and cross-border transfer rules.",
    jurisdiction: "EU / EEA (extraterritorial reach)",
    aliases: ["GDPR"],
  },
  "CCPA-CPRA": {
    id: "CCPA-CPRA", name: "CCPA / CPRA", kind: "regulation",
    version: "CCPA as amended by CPRA", publisher: "State of California", date: "2023-01 (CPRA effective)",
    summary: "California consumer privacy law — rights to know, delete, opt-out of sale/sharing, and limit use of sensitive personal information.",
    jurisdiction: "California, USA",
    aliases: ["CCPA/CPRA", "CCPA", "CPRA"],
  },
  "EU-AI-ACT": {
    id: "EU-AI-ACT", name: "EU AI Act", kind: "regulation",
    version: "Reg. (EU) 2024/1689", publisher: "European Union", date: "2024-08 (entered into force)",
    summary: "EU regulation establishing a risk-based legal framework for AI systems — prohibited practices, high-risk obligations, transparency requirements, and conformity assessment.",
    jurisdiction: "EU (extraterritorial reach)",
    note: "Phased enforcement. High-risk Annex III deadline is 2 Aug 2026, but the Digital Omnibus political agreement (7 May 2026) proposes postponement to 2 Dec 2027 — pending formal adoption. Status as of June 2026.",
    aliases: ["EU AI Act"],
  },
};

/* ---------------------------------------------------------------------------
 * FRAMEWORK REQUIREMENTS / OBJECTIVES
 * Curated catalog of the specific requirements, domains, or objectives
 * referenced by the engine's risk library. Each entry: { ref, group, title,
 * intent } where intent is our paraphrase of what the requirement demands.
 * ref values match the tokens in the risk.frameworks citation strings.
 * Never verbatim standard text — paraphrase + identifier + citation only.
 * ------------------------------------------------------------------------- */
export const FRAMEWORK_REQUIREMENTS = {
  "SOX-ITGC": [
    { ref: "Logical Access", group: "Access to Programs & Data", title: "Logical Access Controls", intent: "Ensure access to systems supporting financial reporting is authorized, provisioned on least-privilege, and periodically recertified." },
    { ref: "Segregation of Duties", group: "Access to Programs & Data", title: "Segregation of Duties", intent: "Prevent any single individual from controlling incompatible functions (e.g., develop, approve, and deploy) over financially relevant systems." },
    { ref: "Change Management", group: "Program Changes", title: "Change Management Controls", intent: "Ensure changes to financially relevant systems are approved, tested, and deployed with segregation of duties." },
    { ref: "Program Development", group: "Program Development", title: "Program Development Controls", intent: "Ensure new systems and major modifications are developed with adequate controls, testing, and approval before deployment." },
    { ref: "Computer Operations", group: "Computer Operations", title: "Computer Operations Controls", intent: "Ensure system availability, batch/job scheduling, and disaster recovery support continuous and accurate financial reporting." },
    { ref: "Data Backup & Recovery", group: "Computer Operations", title: "Backup & Recovery", intent: "Ensure financial data is backed up, protected, and recoverable so reporting continuity survives a disruption." },
    { ref: "Outsourced Services", group: "Outsourced Services", title: "Outsourced Service Provider Controls", intent: "Ensure outsourced IT services are governed by contracts, SOC reports, and oversight that maintain the integrity of financial reporting controls." },
    { ref: "All Domains", group: "Scope", title: "All ITGC Domains", intent: "The system supports financial reporting and must demonstrate effective IT general controls across all domains." },
  ],
  "PCI-DSS": [
    { ref: "Req 1", group: "Build & Maintain a Secure Network", title: "Install and maintain network security controls", intent: "Segment and protect network boundaries to control traffic into and within the cardholder data environment." },
    { ref: "Req 2", group: "Build & Maintain a Secure Network", title: "Apply secure configurations to all system components", intent: "Replace vendor defaults and harden configurations to remove unnecessary services, accounts, and exposure." },
    { ref: "Req 3", group: "Protect Account Data", title: "Protect stored account data", intent: "Minimize stored cardholder data and render any retained data unreadable through strong cryptography." },
    { ref: "Req 4", group: "Protect Account Data", title: "Protect cardholder data in transmission", intent: "Encrypt cardholder data with strong cryptography whenever it is transmitted over open or public networks." },
    { ref: "Req 3-4", group: "Protect Account Data", title: "Protect stored account data & encrypt transmission", intent: "Render stored cardholder data unreadable and encrypt it when transmitted across open or public networks." },
    { ref: "Req 5", group: "Vulnerability Management", title: "Protect systems from malicious software", intent: "Deploy and maintain anti-malware mechanisms and keep them current against evolving threats." },
    { ref: "Req 6", group: "Vulnerability Management", title: "Develop and maintain secure systems and software", intent: "Build, patch, and maintain systems securely throughout the software development life cycle." },
    { ref: "Req 6.5", group: "Vulnerability Management", title: "Protect against common coding vulnerabilities", intent: "Develop and maintain secure software by identifying and remediating known vulnerabilities before deployment." },
    { ref: "Req 7", group: "Strong Access Control", title: "Restrict access by business need to know", intent: "Limit access to cardholder data and system components to only those individuals whose job requires it." },
    { ref: "Req 8", group: "Strong Access Control", title: "Identify users and authenticate access", intent: "Assign unique IDs and authenticate every user accessing system components in the cardholder data environment." },
    { ref: "Req 8.3-8.4", group: "Strong Access Control", title: "Strong authentication for users and administrators", intent: "Enforce multi-factor authentication and strong credential management for all access to the CDE." },
    { ref: "Req 9", group: "Strong Access Control", title: "Restrict physical access to cardholder data", intent: "Control and monitor physical access to systems, media, and facilities that hold cardholder data." },
    { ref: "Req 10", group: "Monitor & Test Networks", title: "Log and monitor all access to system components", intent: "Record, protect, and review audit trails so that anomalous or malicious activity is detected and attributable." },
    { ref: "Req 11", group: "Monitor & Test Networks", title: "Test security of systems and networks regularly", intent: "Run vulnerability scans, penetration tests, and change-detection to confirm controls remain effective." },
    { ref: "Req 12", group: "Maintain a Security Policy", title: "Support information security with policies and programs", intent: "Maintain governing security policies, risk assessments, training, and an incident response capability." },
    { ref: "Req 12.5", group: "Maintain a Security Policy", title: "PCI DSS scope documentation and validation", intent: "Document and validate the scope of the cardholder data environment at least annually and upon significant change." },
    { ref: "Req 12.8", group: "Maintain a Security Policy", title: "Third-party service provider management", intent: "Manage service providers that access or could affect the security of cardholder data through contracts and monitoring." },
    { ref: "Req 12.10.1", group: "Maintain a Security Policy", title: "Incident response plan", intent: "Maintain and test an incident response plan to respond immediately to a suspected or confirmed security breach." },
    { ref: "Scoping & Segmentation", group: "Scoping", title: "CDE scoping and segmentation validation", intent: "Accurately define the cardholder data environment and validate network segmentation to minimize PCI scope." },
  ],
  "NIST-CSF": [
    { ref: "GV.OC", group: "Govern", title: "Organizational Context", intent: "Understand the mission, stakeholders, legal obligations, and dependencies that shape cybersecurity risk decisions." },
    { ref: "GV.RM", group: "Govern", title: "Risk Management Strategy", intent: "Establish and communicate risk appetite, tolerance, and the strategy for managing cybersecurity risk." },
    { ref: "GV.RR", group: "Govern", title: "Roles, Responsibilities & Authorities", intent: "Define and communicate cybersecurity roles, responsibilities, and accountability across the organization." },
    { ref: "GV.PO", group: "Govern", title: "Policy", intent: "Establish, communicate, and maintain cybersecurity policy reflecting risk appetite and legal requirements." },
    { ref: "GV.OV", group: "Govern", title: "Oversight", intent: "Use results of organization-wide risk management activities to inform, improve, and adjust the strategy." },
    { ref: "GV.SC", group: "Govern", title: "Cybersecurity Supply Chain Risk Management", intent: "Identify, assess, and manage cybersecurity risks across suppliers and third-party relationships." },
    { ref: "ID.AM", group: "Identify", title: "Asset Management", intent: "Inventory and manage the data, hardware, software, and services that enable the organization to achieve its purpose." },
    { ref: "ID.RA", group: "Identify", title: "Risk Assessment", intent: "Identify, analyze, and prioritize cybersecurity risk to the organization, its assets, and individuals." },
    { ref: "ID.IM", group: "Identify", title: "Improvement", intent: "Identify improvements to cybersecurity risk management across people, processes, and technology." },
    { ref: "PR.AA", group: "Protect", title: "Identity Management, Authentication & Access Control", intent: "Manage identities, credentials, and access on least-privilege and need-to-know principles, including MFA." },
    { ref: "PR.AT", group: "Protect", title: "Awareness & Training", intent: "Provide personnel with cybersecurity awareness and role-based training to perform their duties securely." },
    { ref: "PR.DS", group: "Protect", title: "Data Security", intent: "Protect the confidentiality, integrity, and availability of data at rest, in transit, and in use." },
    { ref: "PR.PS", group: "Protect", title: "Platform Security", intent: "Manage configuration, patching, and integrity of hardware and software platforms against unauthorized change." },
    { ref: "PR.IR", group: "Protect", title: "Technology Infrastructure Resilience", intent: "Architect and operate infrastructure with redundancy and resilience to maintain availability under stress." },
    { ref: "DE.CM", group: "Detect", title: "Continuous Monitoring", intent: "Monitor assets, networks, and the operating environment to find anomalies and potential compromise." },
    { ref: "DE.AE", group: "Detect", title: "Adverse Event Analysis", intent: "Analyze anomalies and indicators to characterize events and detect cybersecurity incidents." },
    { ref: "RS.MA", group: "Respond", title: "Incident Management", intent: "Execute and coordinate incident response upon detection of a cybersecurity incident." },
    { ref: "RS.AN", group: "Respond", title: "Incident Analysis", intent: "Investigate incidents to determine scope, root cause, and the response needed for effective recovery." },
    { ref: "RS.CO", group: "Respond", title: "Incident Reporting & Communication", intent: "Coordinate response activities and communicate with internal and external stakeholders during incidents." },
    { ref: "RS.MI", group: "Respond", title: "Incident Mitigation", intent: "Contain and eradicate incidents to prevent expansion of impact." },
    { ref: "RC.RP", group: "Recover", title: "Incident Recovery Plan Execution", intent: "Execute recovery plans to restore systems and assets affected by a cybersecurity incident." },
    { ref: "RC.CO", group: "Recover", title: "Incident Recovery Communication", intent: "Coordinate restoration activities and communicate recovery status with internal and external parties." },
  ],
  "NIST-80053": [
    { ref: "AC", group: "Control Family", title: "Access Control", intent: "Limit information-system access to authorized users, processes, and devices on a least-privilege basis." },
    { ref: "AT", group: "Control Family", title: "Awareness & Training", intent: "Ensure personnel are trained on security and privacy responsibilities and threats relevant to their roles." },
    { ref: "AU", group: "Control Family", title: "Audit & Accountability", intent: "Create, protect, and review audit records to support monitoring, analysis, and accountability." },
    { ref: "CA", group: "Control Family", title: "Assessment, Authorization & Monitoring", intent: "Assess controls, authorize systems to operate, and continuously monitor their effectiveness." },
    { ref: "CM", group: "Control Family", title: "Configuration Management", intent: "Establish and maintain secure baseline configurations and control changes to system components." },
    { ref: "CP", group: "Control Family", title: "Contingency Planning", intent: "Plan, test, and maintain capabilities to recover systems and operations after disruption." },
    { ref: "IA", group: "Control Family", title: "Identification & Authentication", intent: "Uniquely identify and authenticate users and devices, including multi-factor for privileged and remote access." },
    { ref: "IR", group: "Control Family", title: "Incident Response", intent: "Establish an incident handling capability covering preparation, detection, analysis, containment, and recovery." },
    { ref: "MA", group: "Control Family", title: "Maintenance", intent: "Perform and control system maintenance, including remote and third-party maintenance, securely." },
    { ref: "MP", group: "Control Family", title: "Media Protection", intent: "Protect, sanitize, and control digital and physical media containing sensitive information." },
    { ref: "PE", group: "Control Family", title: "Physical & Environmental Protection", intent: "Restrict physical access and protect systems from environmental hazards and power disruption." },
    { ref: "PL", group: "Control Family", title: "Planning", intent: "Develop and maintain security and privacy plans and rules of behavior for systems." },
    { ref: "PM", group: "Control Family", title: "Program Management", intent: "Manage the organization-wide information security and privacy program and its resources." },
    { ref: "PS", group: "Control Family", title: "Personnel Security", intent: "Apply screening, agreements, and transfer/termination controls to manage personnel risk." },
    { ref: "PT", group: "Control Family", title: "PII Processing & Transparency", intent: "Govern the processing of personally identifiable information with consent, purpose limits, and transparency." },
    { ref: "RA", group: "Control Family", title: "Risk Assessment", intent: "Assess risk to operations and assets, including vulnerability scanning and threat analysis." },
    { ref: "SA", group: "Control Family", title: "System & Services Acquisition", intent: "Build security and supply-chain requirements into the acquisition and development life cycle." },
    { ref: "SC", group: "Control Family", title: "System & Communications Protection", intent: "Protect information at boundaries and in transit, including cryptography and segmentation." },
    { ref: "SI", group: "Control Family", title: "System & Information Integrity", intent: "Identify, report, and remediate flaws; protect against malicious code; and monitor system integrity." },
    { ref: "SR", group: "Control Family", title: "Supply Chain Risk Management", intent: "Manage cybersecurity risks across the system and component supply chain." },
  ],
  "NIST-RMF": [
    { ref: "Prepare", group: "Step 0", title: "Prepare", intent: "Carry out the organization- and system-level activities needed to be ready to manage security and privacy risk." },
    { ref: "Categorize", group: "Step 1", title: "Categorize", intent: "Categorize the system and the information it processes based on an analysis of impact (FIPS 199)." },
    { ref: "Select", group: "Step 2", title: "Select", intent: "Select an initial baseline of SP 800-53 controls and tailor it to the assessed risk." },
    { ref: "Implement", group: "Step 3", title: "Implement", intent: "Implement the selected controls and document how they are deployed in the system and environment." },
    { ref: "Assess", group: "Step 4", title: "Assess", intent: "Assess the controls to confirm they are implemented correctly and producing the intended outcome." },
    { ref: "Authorize", group: "Step 5", title: "Authorize", intent: "Obtain a senior official's risk-based decision to authorize the system to operate (the ATO)." },
    { ref: "Monitor", group: "Step 6", title: "Monitor", intent: "Continuously monitor controls and the risk posture, reporting changes to authorizing officials." },
  ],
  "NIST-AI-RMF": [
    { ref: "GOVERN", group: "Function", title: "Govern", intent: "Cultivate a culture, policies, and accountability structures for responsible AI risk management across the lifecycle." },
    { ref: "MAP", group: "Function", title: "Map", intent: "Establish the context and identify risks tied to an AI system's purpose, data, and intended and unintended uses." },
    { ref: "MEASURE", group: "Function", title: "Measure", intent: "Analyze, assess, and track AI risks and trustworthiness using quantitative and qualitative methods." },
    { ref: "MANAGE", group: "Function", title: "Manage", intent: "Prioritize and act on mapped and measured risks, allocating resources and monitoring over time." },
    { ref: "Generative AI Profile", group: "Profile", title: "Generative AI Profile (NIST AI 600-1)", intent: "Apply the RMF to generative-AI-specific risks such as confabulation, data leakage, and harmful or biased output." },
  ],
  "ISO-27001": [
    { ref: "Clause 4", group: "Management System", title: "Context of the organization", intent: "Determine internal/external issues, interested parties, and the scope of the information security management system." },
    { ref: "Clause 5", group: "Management System", title: "Leadership", intent: "Secure top-management commitment, an information security policy, and assigned roles and responsibilities." },
    { ref: "Clause 6", group: "Management System", title: "Planning", intent: "Address risks and opportunities, perform risk assessment and treatment, and set security objectives." },
    { ref: "Clause 7", group: "Management System", title: "Support", intent: "Provide resources, competence, awareness, communication, and documented information for the ISMS." },
    { ref: "Clause 8", group: "Management System", title: "Operation", intent: "Plan, implement, and control the processes needed to meet security requirements and treat risk." },
    { ref: "Clause 9", group: "Management System", title: "Performance evaluation", intent: "Monitor, measure, audit, and review the ISMS to evaluate its effectiveness." },
    { ref: "Clause 10", group: "Management System", title: "Improvement", intent: "Drive continual improvement and corrective action in response to nonconformities." },
    { ref: "A.5.1", group: "A.5 Organizational", title: "Policies for information security", intent: "Define, approve, publish, and review a set of information security policies." },
    { ref: "A.5.7", group: "A.5 Organizational", title: "Threat intelligence", intent: "Collect and analyze information about threats to inform protective action." },
    { ref: "A.5.9", group: "A.5 Organizational", title: "Inventory of information and associated assets", intent: "Maintain an inventory of information and associated assets with assigned ownership." },
    { ref: "A.5.12", group: "A.5 Organizational", title: "Classification of information", intent: "Classify information by sensitivity to drive proportionate handling and protection." },
    { ref: "A.5.15", group: "A.5 Organizational", title: "Access control", intent: "Establish and enforce rules controlling logical and physical access based on business and security requirements." },
    { ref: "A.5.17", group: "A.5 Organizational", title: "Authentication information", intent: "Control the allocation and management of authentication information through a defined process." },
    { ref: "A.5.19", group: "A.5 Organizational", title: "Information security in supplier relationships", intent: "Manage information security risks associated with the use of supplier products and services." },
    { ref: "A.5.23", group: "A.5 Organizational", title: "Information security for use of cloud services", intent: "Govern the acquisition, use, management, and exit of cloud services for security." },
    { ref: "A.5.24", group: "A.5 Organizational", title: "Information security incident management planning", intent: "Plan and prepare for incidents by defining responsibilities, procedures, and reporting channels." },
    { ref: "A.5.30", group: "A.5 Organizational", title: "ICT readiness for business continuity", intent: "Ensure ICT services can be recovered to required levels within defined timeframes after disruption." },
    { ref: "A.5.31", group: "A.5 Organizational", title: "Legal, statutory, regulatory & contractual requirements", intent: "Identify and meet the legal and contractual obligations relevant to information security." },
    { ref: "A.5.33", group: "A.5 Organizational", title: "Protection of records", intent: "Protect records from loss, destruction, falsification, and unauthorized access or release." },
    { ref: "A.5.34", group: "A.5 Organizational", title: "Privacy and protection of PII", intent: "Ensure privacy and protection of personally identifiable information as required by law and regulation." },
    { ref: "A.6.3", group: "A.6 People", title: "Information security awareness, education & training", intent: "Provide personnel with appropriate security awareness and role-relevant training." },
    { ref: "A.6.8", group: "A.6 People", title: "Information security event reporting", intent: "Provide a mechanism for personnel to report observed or suspected security events promptly." },
    { ref: "A.7.1", group: "A.7 Physical", title: "Physical security perimeters", intent: "Define and protect physical perimeters around information and information-processing facilities." },
    { ref: "A.7.4", group: "A.7 Physical", title: "Physical security monitoring", intent: "Continuously monitor premises for unauthorized physical access." },
    { ref: "A.8.2", group: "A.8 Technological", title: "Privileged access rights", intent: "Restrict and manage the allocation and use of privileged access rights." },
    { ref: "A.8.5", group: "A.8 Technological", title: "Secure authentication", intent: "Implement secure authentication technologies and procedures based on access-control rules." },
    { ref: "A.8.8", group: "A.8 Technological", title: "Management of technical vulnerabilities", intent: "Obtain vulnerability information and take timely action to address exposure." },
    { ref: "A.8.9", group: "A.8 Technological", title: "Configuration management", intent: "Establish, document, and monitor secure configurations of hardware, software, and services." },
    { ref: "A.8.13", group: "A.8 Technological", title: "Information backup", intent: "Maintain and regularly test backups of information, software, and systems per the backup policy." },
    { ref: "A.8.14", group: "A.8 Technological", title: "Redundancy of information processing facilities", intent: "Implement processing facilities with sufficient redundancy to meet availability requirements." },
    { ref: "A.8.15", group: "A.8 Technological", title: "Logging", intent: "Produce, store, protect, and analyze logs of activities, exceptions, faults, and security events." },
    { ref: "A.8.16", group: "A.8 Technological", title: "Monitoring activities", intent: "Monitor networks, systems, and applications for anomalous behavior and potential incidents." },
    { ref: "A.8.24", group: "A.8 Technological", title: "Use of cryptography", intent: "Define and implement rules for the effective use of cryptography including key management." },
    { ref: "A.8.25", group: "A.8 Technological", title: "Secure development life cycle", intent: "Establish and apply rules for the secure development of software and systems." },
    { ref: "A.8.28", group: "A.8 Technological", title: "Secure coding", intent: "Apply secure coding principles to reduce vulnerabilities introduced during development." },
    { ref: "A.8.32", group: "A.8 Technological", title: "Change management", intent: "Subject changes to information-processing facilities and systems to change management procedures." },
  ],
  "ISO-42001": [
    { ref: "Clause 4-10", group: "Management System", title: "AI management system (AIMS) clauses", intent: "Establish, implement, maintain, and continually improve an AI management system across context, leadership, planning, support, operation, evaluation, and improvement." },
    { ref: "A.2", group: "Annex A", title: "AI policy", intent: "Define and maintain an organizational policy for the responsible development and use of AI." },
    { ref: "A.3", group: "Annex A", title: "Internal organization & roles", intent: "Assign AI roles, responsibilities, and accountability for oversight throughout the AI lifecycle." },
    { ref: "A.4", group: "Annex A", title: "Resources for AI systems", intent: "Identify and document the data, tooling, compute, and human resources AI systems depend on." },
    { ref: "A.5", group: "Annex A", title: "AI system impact assessment", intent: "Assess impacts of AI systems on individuals, groups, and society throughout their lifecycle." },
    { ref: "A.6", group: "Annex A", title: "AI system lifecycle management", intent: "Apply responsible-development controls across design, verification, deployment, and operation of AI systems." },
    { ref: "A.7", group: "Annex A", title: "Data for AI systems", intent: "Govern the quality, provenance, and handling of data used to develop and operate AI systems." },
    { ref: "A.8", group: "Annex A", title: "Information for interested parties", intent: "Provide transparency and documentation to users and affected parties about AI systems." },
    { ref: "A.10", group: "Annex A", title: "Third-party & supplier relationships", intent: "Manage responsibilities and risks where AI systems are supplied by or rely on third parties." },
  ],
  "ISO-22301": [
    { ref: "Clause 4", group: "Management System", title: "Context of the organization", intent: "Determine the scope, interested parties, and requirements of the business continuity management system." },
    { ref: "Clause 5", group: "Management System", title: "Leadership", intent: "Secure leadership commitment, a continuity policy, and assigned roles for the BCMS." },
    { ref: "Clause 6", group: "Management System", title: "Planning", intent: "Set continuity objectives and address risks and opportunities for the management system." },
    { ref: "Clause 7", group: "Management System", title: "Support", intent: "Provide resources, competence, awareness, and documented information for continuity." },
    { ref: "Clause 8.2.2 (BIA)", group: "Operation", title: "Business Impact Analysis", intent: "Analyze the impact of disruption to prioritized activities, setting recovery time and data-loss objectives." },
    { ref: "Clause 8.2.3", group: "Operation", title: "Risk assessment", intent: "Identify and assess risks of disruption to prioritized activities and their resources." },
    { ref: "Clause 8.3", group: "Operation", title: "Business continuity strategies & solutions", intent: "Select strategies and solutions to meet recovery objectives for prioritized activities." },
    { ref: "Clause 8.4", group: "Operation", title: "Business continuity plans and procedures", intent: "Establish documented procedures for responding to and recovering from disruptive incidents." },
    { ref: "Clause 8.4.3", group: "Operation", title: "Warning & communication", intent: "Establish procedures for communicating internally and externally during and following a disruption." },
    { ref: "Clause 8.4.4", group: "Operation", title: "Business continuity plans", intent: "Establish procedures and resources to restore prioritized activities to an acceptable level after disruption." },
    { ref: "Clause 8.5", group: "Operation", title: "Exercise programme", intent: "Exercise and test continuity arrangements to validate their effectiveness and surface gaps." },
    { ref: "Clause 9", group: "Management System", title: "Performance evaluation", intent: "Monitor, measure, audit, and review the BCMS for effectiveness." },
    { ref: "Clause 10", group: "Management System", title: "Improvement", intent: "Address nonconformities and continually improve continuity capability." },
  ],
  "COBIT": [
    { ref: "EDM", group: "Governance Domain", title: "Evaluate, Direct & Monitor", intent: "Governance objectives: evaluate stakeholder needs, set direction, and monitor enterprise IT performance and conformance." },
    { ref: "APO", group: "Management Domain", title: "Align, Plan & Organize", intent: "Management objectives covering strategy, architecture, risk, security, and resource organization for IT." },
    { ref: "BAI", group: "Management Domain", title: "Build, Acquire & Implement", intent: "Management objectives covering solution delivery, change management, and transition into operations." },
    { ref: "DSS", group: "Management Domain", title: "Deliver, Service & Support", intent: "Management objectives covering operations, service requests, incidents, continuity, and security services." },
    { ref: "MEA", group: "Management Domain", title: "Monitor, Evaluate & Assess", intent: "Management objectives covering performance monitoring, internal control, and compliance assessment." },
    { ref: "APO12", group: "Key Objective", title: "Managed Risk", intent: "Continually identify, assess, and reduce IT-related risk within tolerance set by leadership." },
    { ref: "APO13", group: "Key Objective", title: "Managed Security", intent: "Define, operate, and monitor an information security management system." },
    { ref: "BAI06", group: "Key Objective", title: "Managed IT Changes", intent: "Manage all changes in a controlled manner, including emergency changes, to reduce risk to operations." },
    { ref: "DSS04", group: "Key Objective", title: "Managed Continuity", intent: "Establish and maintain a plan to enable continuation of critical operations through a disruption." },
    { ref: "DSS05", group: "Key Objective", title: "Managed Security Services", intent: "Operate security services — endpoint, identity, network, and monitoring — to protect information." },
    { ref: "MEA03", group: "Key Objective", title: "Managed Compliance with External Requirements", intent: "Identify and confirm compliance with external legal, regulatory, and contractual requirements." },
  ],
  "GDPR": [
    { ref: "GDPR", group: "General", title: "General Data Protection Regulation", intent: "Regulation governing the processing of personal data including lawful basis, data-subject rights, and breach notification." },
    { ref: "Art. 5", group: "Principles", title: "Principles of processing", intent: "Process personal data lawfully, fairly, and transparently with purpose limitation, minimization, accuracy, and integrity." },
    { ref: "Art. 5(1)(e)", group: "Principles", title: "Storage limitation", intent: "Keep personal data in identifiable form no longer than necessary for the purposes of processing." },
    { ref: "Art. 6", group: "Lawfulness", title: "Lawfulness of processing", intent: "Process personal data only where a valid legal basis such as consent, contract, or legitimate interest applies." },
    { ref: "Art. 9", group: "Lawfulness", title: "Special categories of data", intent: "Apply heightened protections and a specific condition before processing sensitive categories of personal data." },
    { ref: "Art. 12-22", group: "Data Subject Rights", title: "Rights of the data subject", intent: "Enable access, rectification, erasure, restriction, portability, and objection within statutory timelines." },
    { ref: "Art. 25", group: "Accountability", title: "Data protection by design and by default", intent: "Embed data-protection measures into processing activities and default to the most privacy-protective settings." },
    { ref: "Art. 28", group: "Accountability", title: "Processor obligations", intent: "Bind processors by contract to process personal data only on instructions and with adequate safeguards." },
    { ref: "Art. 30", group: "Accountability", title: "Records of processing activities", intent: "Maintain records describing processing purposes, categories, recipients, and safeguards." },
    { ref: "Art. 32", group: "Security", title: "Security of processing", intent: "Implement technical and organizational measures appropriate to the risk, including encryption and resilience." },
    { ref: "Art. 33-34", group: "Security", title: "Personal data breach notification", intent: "Notify the supervisory authority within 72 hours and affected individuals where risk is high." },
    { ref: "Art. 35", group: "Accountability", title: "Data protection impact assessment", intent: "Assess and mitigate risks before processing likely to result in high risk to individuals." },
    { ref: "Art. 44-49", group: "Transfers", title: "International data transfers", intent: "Transfer personal data outside the EEA only with an adequacy decision or appropriate safeguards." },
  ],
  "CCPA-CPRA": [
    { ref: "CCPA/CPRA", group: "General", title: "CCPA as amended by CPRA", intent: "California consumer privacy law establishing rights to know, delete, opt-out of sale/sharing, and limit use of sensitive personal information." },
    { ref: "Right to Know", group: "Consumer Rights", title: "Right to know / access", intent: "Allow consumers to learn what personal information is collected, used, shared, or sold about them." },
    { ref: "Right to Delete", group: "Consumer Rights", title: "Right to delete", intent: "Allow consumers to request deletion of personal information collected about them, subject to exceptions." },
    { ref: "Right to Correct", group: "Consumer Rights", title: "Right to correct", intent: "Allow consumers to request correction of inaccurate personal information (added by CPRA)." },
    { ref: "Right to Opt-Out", group: "Consumer Rights", title: "Right to opt out of sale/sharing", intent: "Allow consumers to opt out of the sale or sharing of their personal information, including via opt-out signals." },
    { ref: "Right to Limit", group: "Consumer Rights", title: "Right to limit use of sensitive PI", intent: "Allow consumers to limit use and disclosure of sensitive personal information (added by CPRA)." },
    { ref: "Non-Discrimination", group: "Consumer Rights", title: "Right to non-discrimination", intent: "Prohibit discrimination against consumers for exercising their privacy rights." },
    { ref: "Notice at Collection", group: "Business Obligations", title: "Notice at collection", intent: "Inform consumers at or before collection of the categories and purposes of personal information collected." },
    { ref: "Service Provider Contracts", group: "Business Obligations", title: "Service provider & contractor terms", intent: "Bind service providers and contractors by contract to limit use of personal information to permitted purposes." },
    { ref: "Risk Assessments & Audits", group: "Business Obligations", title: "Risk assessments & cybersecurity audits", intent: "Conduct risk assessments and cybersecurity audits for high-risk processing (CPRA / CPPA regulations)." },
    { ref: "Data Minimization", group: "Business Obligations", title: "Data minimization & purpose limitation", intent: "Collect and retain personal information only as reasonably necessary and proportionate to disclosed purposes." },
  ],
  "EU-AI-ACT": [
    { ref: "EU AI Act (risk-tiering)", group: "Risk Classification", title: "AI risk-tiering and high-risk obligations", intent: "Classify AI systems by risk level and apply proportionate requirements — prohibited practices, high-risk conformity obligations, and transparency rules." },
    { ref: "Art. 5", group: "Risk Classification", title: "Prohibited AI practices", intent: "Ban unacceptable-risk uses such as social scoring and certain manipulative or exploitative systems." },
    { ref: "Art. 6 / Annex III", group: "Risk Classification", title: "High-risk AI systems", intent: "Designate AI in sensitive domains (e.g., employment, credit, biometrics) as high-risk and subject to obligations." },
    { ref: "Art. 9", group: "High-Risk Obligations", title: "Risk management system", intent: "Establish a continuous risk management process across the high-risk AI system lifecycle." },
    { ref: "Art. 10", group: "High-Risk Obligations", title: "Data and data governance", intent: "Use training, validation, and test data that is relevant, representative, and appropriately governed." },
    { ref: "Art. 12", group: "High-Risk Obligations", title: "Record-keeping / logging", intent: "Automatically log events over the high-risk AI system's lifetime to ensure traceability." },
    { ref: "Art. 14", group: "High-Risk Obligations", title: "Human oversight", intent: "Design high-risk AI systems so humans can effectively oversee and intervene in their operation." },
    { ref: "Art. 50", group: "Transparency", title: "Transparency obligations", intent: "Disclose AI interaction, label synthetic content, and inform users of emotion-recognition or deepfake systems." },
    { ref: "Art. 51-55", group: "GPAI", title: "General-purpose AI model obligations", intent: "Impose documentation, copyright, and systemic-risk obligations on general-purpose AI model providers." },
  ],
};

export const FRAMEWORK_ALIASES = {};
Object.values(FRAMEWORKS).forEach((fw) => {
  (fw.aliases || []).forEach((alias) => { FRAMEWORK_ALIASES[alias] = fw.id; });
});

/* ---------------------------------------------------------------------------
 * CONTROL → FRAMEWORK REQUIREMENT CROSSWALK
 * The precise auditor crosswalk: for each curated control, the specific
 * requirement / objective references it helps satisfy across each framework.
 * ref tokens match FRAMEWORK_REQUIREMENTS so the engine joins control →
 * requirement → intent cleanly. This is a direct, curated mapping (not
 * derived through risks) — the same kind of crosswalk SCF_MAPPING provides
 * for the SCF, extended to every named framework and regulation.
 * ------------------------------------------------------------------------- */
export const CONTROL_FRAMEWORK_MAP = {
  "CTL-CHG-001": { "PCI-DSS": ["Req 6"], "SOX-ITGC": ["Change Management", "Segregation of Duties"], "ISO-27001": ["A.8.32"], "NIST-CSF": ["PR.PS"], "NIST-80053": ["CM"], "COBIT": ["BAI06"] },
  "CTL-CHG-002": { "PCI-DSS": ["Req 6", "Req 6.5"], "SOX-ITGC": ["Change Management", "Program Development"], "ISO-27001": ["A.8.32", "A.8.25"], "NIST-CSF": ["PR.PS"], "NIST-80053": ["CM", "SA"], "COBIT": ["BAI06"] },
  "CTL-CHG-003": { "PCI-DSS": ["Req 6"], "SOX-ITGC": ["Change Management"], "ISO-27001": ["A.8.32"], "NIST-CSF": ["PR.PS"], "NIST-80053": ["CM"], "COBIT": ["BAI06"] },
  "CTL-AVL-001": { "SOX-ITGC": ["Computer Operations", "Data Backup & Recovery"], "ISO-27001": ["A.8.13"], "ISO-22301": ["Clause 8.4"], "NIST-CSF": ["PR.DS"], "NIST-80053": ["CP"], "COBIT": ["DSS04"] },
  "CTL-AVL-002": { "SOX-ITGC": ["Computer Operations"], "ISO-27001": ["A.8.16"], "NIST-CSF": ["DE.CM"], "NIST-80053": ["SI"], "NIST-RMF": ["Monitor"], "COBIT": ["DSS05"] },
  "CTL-DR-001": { "SOX-ITGC": ["Computer Operations", "Data Backup & Recovery"], "ISO-27001": ["A.5.30"], "ISO-22301": ["Clause 8.4", "Clause 8.4.4", "Clause 8.5"], "NIST-CSF": ["RC.RP"], "NIST-80053": ["CP"], "COBIT": ["DSS04"] },
  "CTL-DR-002": { "PCI-DSS": ["Req 12.8"], "SOX-ITGC": ["Outsourced Services"], "ISO-27001": ["A.5.19", "A.5.30"], "ISO-22301": ["Clause 8.3"], "NIST-CSF": ["GV.SC"], "NIST-80053": ["CP", "SR"], "COBIT": ["DSS04"] },
  "CTL-IAM-001": { "PCI-DSS": ["Req 7"], "SOX-ITGC": ["Logical Access"], "ISO-27001": ["A.5.15", "A.8.2"], "NIST-CSF": ["PR.AA"], "NIST-80053": ["AC"], "COBIT": ["DSS05"] },
  "CTL-IAM-002": { "PCI-DSS": ["Req 8", "Req 8.3-8.4"], "SOX-ITGC": ["Logical Access"], "ISO-27001": ["A.5.17", "A.8.5"], "NIST-CSF": ["PR.AA"], "NIST-80053": ["IA"], "COBIT": ["DSS05"] },
  "CTL-IAM-003": { "PCI-DSS": ["Req 7", "Req 8"], "SOX-ITGC": ["Logical Access", "Segregation of Duties"], "ISO-27001": ["A.5.15", "A.8.2"], "NIST-CSF": ["PR.AA"], "NIST-80053": ["AC"], "NIST-RMF": ["Assess", "Monitor"], "COBIT": ["DSS05", "MEA03"] },
  "CTL-IAM-004": { "PCI-DSS": ["Req 8", "Req 8.3-8.4"], "SOX-ITGC": ["Logical Access"], "ISO-27001": ["A.5.17", "A.8.5"], "NIST-CSF": ["PR.AA"], "NIST-80053": ["IA"], "COBIT": ["DSS05"] },
  "CTL-LOG-001": { "PCI-DSS": ["Req 10"], "SOX-ITGC": ["Computer Operations"], "ISO-27001": ["A.8.15"], "NIST-CSF": ["DE.CM"], "NIST-80053": ["AU"], "NIST-RMF": ["Monitor"], "COBIT": ["DSS05"] },
  "CTL-LOG-002": { "PCI-DSS": ["Req 10"], "ISO-27001": ["A.8.15", "A.8.16"], "NIST-CSF": ["DE.CM", "DE.AE"], "NIST-80053": ["AU", "IR", "SI"], "NIST-RMF": ["Monitor"], "COBIT": ["DSS05"] },
  "CTL-ENC-001": { "PCI-DSS": ["Req 3", "Req 3-4"], "ISO-27001": ["A.8.24"], "NIST-CSF": ["PR.DS"], "NIST-80053": ["SC"], "GDPR": ["Art. 32"], "COBIT": ["DSS05"] },
  "CTL-ENC-002": { "PCI-DSS": ["Req 4", "Req 3-4"], "ISO-27001": ["A.8.24"], "NIST-CSF": ["PR.DS"], "NIST-80053": ["SC"], "GDPR": ["Art. 32"], "COBIT": ["DSS05"] },
  "CTL-DAT-001": { "PCI-DSS": ["Req 3"], "ISO-27001": ["A.5.12", "A.5.9"], "NIST-CSF": ["ID.AM", "PR.DS"], "NIST-80053": ["RA"], "NIST-RMF": ["Categorize"], "GDPR": ["Art. 5", "Art. 30"], "CCPA-CPRA": ["Data Minimization"] },
  "CTL-DAT-002": { "ISO-27001": ["A.5.33"], "NIST-CSF": ["PR.DS"], "NIST-80053": ["MP"], "GDPR": ["Art. 5(1)(e)"], "CCPA-CPRA": ["Right to Delete", "Data Minimization"] },
  "CTL-PRI-001": { "ISO-27001": ["A.5.34"], "NIST-CSF": ["GV.PO"], "NIST-80053": ["PT"], "GDPR": ["Art. 12-22", "Art. 6", "Art. 25"], "CCPA-CPRA": ["Right to Know", "Right to Delete", "Right to Correct", "Notice at Collection", "Right to Opt-Out"] },
  "CTL-TPR-001": { "PCI-DSS": ["Req 12.8"], "SOX-ITGC": ["Outsourced Services"], "ISO-27001": ["A.5.19"], "NIST-CSF": ["GV.SC"], "NIST-80053": ["SR"], "COBIT": ["APO12"] },
  "CTL-TPR-002": { "PCI-DSS": ["Req 12.8"], "SOX-ITGC": ["Outsourced Services"], "ISO-27001": ["A.5.19", "A.5.23"], "NIST-CSF": ["GV.SC"], "NIST-80053": ["SR", "SA"], "GDPR": ["Art. 28"], "CCPA-CPRA": ["Service Provider Contracts"] },
  "CTL-TPR-003": { "PCI-DSS": ["Req 12.8"], "SOX-ITGC": ["Outsourced Services"], "ISO-27001": ["A.5.19"], "NIST-CSF": ["GV.SC"], "NIST-80053": ["SR"], "NIST-RMF": ["Monitor"], "COBIT": ["APO12", "MEA03"] },
  "CTL-PCI-001": { "PCI-DSS": ["Scoping & Segmentation", "Req 1", "Req 12.5"], "NIST-CSF": ["ID.AM", "PR.IR"], "NIST-80053": ["SC", "CA"], "COBIT": ["APO13"] },
  "CTL-AI-001": { "NIST-AI-RMF": ["GOVERN", "MAP"], "ISO-42001": ["A.2", "A.3", "A.5"], "EU-AI-ACT": ["Art. 6 / Annex III", "EU AI Act (risk-tiering)"], "NIST-CSF": ["ID.AM", "GV.RR"], "NIST-80053": ["PM", "RA"] },
  "CTL-AI-002": { "NIST-AI-RMF": ["MAP", "MEASURE"], "ISO-42001": ["A.7"], "ISO-27001": ["A.5.34", "A.8.24"], "GDPR": ["Art. 5", "Art. 32", "Art. 35"], "EU-AI-ACT": ["Art. 10"], "NIST-CSF": ["PR.DS"] },
  "CTL-AI-003": { "NIST-AI-RMF": ["MEASURE", "MANAGE"], "ISO-42001": ["A.6", "A.5"], "EU-AI-ACT": ["Art. 14", "Art. 50"], "NIST-CSF": ["GV.OV"] },
  "CTL-BIA-001": { "ISO-22301": ["Clause 8.2.2 (BIA)"], "ISO-27001": ["A.5.30"], "NIST-CSF": ["ID.RA"], "NIST-80053": ["CP", "RA"], "NIST-RMF": ["Categorize"], "COBIT": ["DSS04"] },
  "CTL-RES-SITE-001": { "ISO-22301": ["Clause 8.3", "Clause 8.4.4"], "ISO-27001": ["A.8.14", "A.5.30"], "NIST-CSF": ["PR.IR"], "NIST-80053": ["CP"], "COBIT": ["DSS04"] },
  "CTL-RES-COMM-001": { "ISO-22301": ["Clause 8.4.3"], "ISO-27001": ["A.5.24"], "NIST-CSF": ["RC.CO", "RS.CO"], "NIST-80053": ["IR", "CP"], "COBIT": ["DSS04"] },
  "CTL-RES-PWR-001": { "ISO-22301": ["Clause 8.4.4"], "ISO-27001": ["A.8.14"], "NIST-CSF": ["PR.IR"], "NIST-80053": ["PE", "CP"], "COBIT": ["DSS04"] },
  "CTL-RES-ROLE-001": { "ISO-22301": ["Clause 8.4", "Clause 5"], "ISO-27001": ["A.5.24"], "NIST-CSF": ["RS.MA", "GV.RR"], "NIST-80053": ["IR", "CP"], "COBIT": ["DSS04"] },
  "CTL-RES-EX-001": { "ISO-22301": ["Clause 8.5"], "ISO-27001": ["A.5.30"], "NIST-CSF": ["ID.IM", "RC.RP"], "NIST-80053": ["CP", "IR"], "NIST-RMF": ["Assess"], "COBIT": ["DSS04"] },
};

/* ===== END KNOWLEDGE LIBRARY ===== */
