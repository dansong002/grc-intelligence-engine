# GRC Intelligence Engine

A React prototype that turns a plain-language description of a technology initiative into a sourced, auditor-ready governance package: risks rated for inherent and target-residual exposure, mapped controls with owners, implementation checklists, audit testing procedures, framework mapping, and a recommended governance document set across five tiers.

**Live demo:** _add Cloudflare Pages URL once deployed_

Runs entirely in the browser. No backend, no telemetry, no data leaves the page.

![Screenshot](docs/screenshot.png)

## Design thesis

**The moat is the curated library, not the model.** Anyone can wrap an LLM around a compliance prompt. The defensible asset here is a hand-curated risk-control-framework-evidence graph — versioned, inspectable, and improving with every assessment cycle. The AI layer is optional and additive; it surfaces initiative-specific nuance on top of a deterministic baseline. Remove the model and the product still works. Remove the library and there is no product.

**Assistive draft, human accountable.** Every output is positioned as decision-support for a qualified practitioner — never a replacement for professional judgment. That framing is both honest and what keeps the product legally viable. Output does not constitute an audit opinion, a QSA assessment, or legal advice.

**Deterministic core, AI at the edge.** The classification engine, risk scoring, control mapping, residual calculation, and document recommendations are all deterministic and traceable. The only AI touchpoint is Section 07 ("Deepen with AI"), which asks a model to identify initiative-specific considerations the generic baseline would miss — clearly labeled, clearly optional.

## How it works

1. **Describe an initiative** in plain language — "we're adding a new payment vendor," "a tornado knocked our stores offline," "we're deploying an AI chatbot."
2. **The engine classifies** the initiative into one or more system archetypes using keyword signal matching (no ML).
3. **Archetypes activate risks** from the curated library. Each risk carries an inherent rating, mapped controls, and framework references.
4. **Residual risk is computed** deterministically: controls reduce inherent exposure by type (preventive > detective > corrective), with tunable weights. The result is a *target* residual assuming controls are implemented — not current-state.
5. **The output package** includes a risk register, control matrix, implementation checklist, audit testing procedures, framework mapping, governance document recommendations, and an optional AI-deepened review.
6. **Everything traces back** to the library. Click any risk or control to inspect its source entry: statement, owner, frequency, evidence expectations.

## Key design decisions

- **Knowledge library as data, not code.** Risks, controls, procedures, and document mappings are declared as structured data objects, not embedded in rendering logic. A practitioner can extend or recalibrate without touching the engine.
- **Residual risk model is transparent.** Weights and reduction points are exposed as tunable constants, not buried in logic. The UI shows the full breakdown: how many preventive, detective, and corrective controls contributed, total points, and levels reduced.
- **Governance documents are recommendations, not authored content.** The engine recommends the document set (policies, standards, procedures, guidelines, charters) that should back each control — it does not write the documents themselves.
- **Export is self-contained HTML.** The downloadable summary is a single HTML file with inline CSS, printable and archivable without dependencies.
- **AI feature is env-gated.** The "Deepen with AI" feature requires an API key set via environment variable. Without it, the feature shows a helpful message and the curated baseline stands on its own.

## Run locally

```bash
npm install
npm run dev
```

To enable the optional "Deepen with AI" layer locally, copy `.env.example` to `.env.local` and set a provider + key. The engine supports Anthropic Messages and OpenAI-compatible Chat Completions (covers OpenAI, Azure OpenAI, OpenRouter, and local models).

```bash
cp .env.example .env.local
# Set VITE_AI_PROVIDER (anthropic | openai) and VITE_AI_API_KEY
```

`VITE_*` variables are bundled into the client build, so the public deployment ships **without** a key. Anyone running the engine locally can wire in their own.

## Knowledge library coverage

The current library (v0.4.0) covers:

- **40 risks** across Technology, Cybersecurity, Data Security & Privacy, Third-Party Risk, Compliance, AI Governance, Resilience, and Operations
- **50 controls** with implementation steps and audit testing procedures for each, cross-referenced to the Secure Controls Framework (SCF) 2026.1
- **15 system archetypes** spanning SaaS Financial/ERP, Payments/CDE, AI/GenAI, General SaaS, Data Platform, Infrastructure Change, Physical Site Outage/DR, Retail & Fuel Operations, Distribution & Replenishment, Procure-to-Pay, Payroll & HR, Payment Acceptance (POS), Endpoint & Identity, Network & Perimeter, and Incident Response
- **6 industry profiles** with critical-process, framework-overlay, and BIA-weighting detail: Retail & Fuel (C-Store, deep), Banking, Crypto, Manufacturing & Defense, Healthcare, and General
- **20 framework references**: SOX ITGC, PCI DSS 4.0.1, NIST CSF 2.0, NIST 800-53 Rev5, NIST RMF, NIST AI RMF, ISO/IEC 27001:2022, ISO/IEC 42001:2023, ISO 22301, COBIT 2019, Secure Controls Framework 2026.1, FFIEC IT Examination Handbook, CMMC, NIST SP 800-171, GDPR, CCPA/CPRA, EU AI Act, HIPAA/HITECH, GLBA, and MiCA — each linked to its official source
- **20 convergence pathways** documenting how a GRC-owned spine failure cascades into a domain owned by another function
- **Governance document recommendations** for every control across 5 tiers (charters, policies, standards, procedures, guidelines)

## Disclaimer

This project was built independently as personal R&D. It uses only publicly available frameworks (NIST, PCI SSC, ISO references) and synthetic example scenarios. It contains no confidential or employer-proprietary information — no internal policies, control libraries, risk registers, vendor names, or assessment data from any employer past or present.

All output is decision-support material. It does not constitute a professional opinion, audit opinion, QSA assessment, or legal advice.

## Not in scope

The following were deliberately left out of this prototype to keep focus on the core design thesis:

- **System integrations** — no ServiceNow, OneTrust, or SIEM connectors yet; the "Connect your risk register" placeholder in the Library frames the intended write-back model (gap-detection vs. an existing register, draft-entry sync) but is not wired up. The current value proposition is the knowledge graph, not the plumbing.
- **User authentication and multi-tenancy** — the public preview is a single-user, in-browser experience. Implementation Checklist progress persists to the user's own `localStorage`.
- **Persistent storage** — assessments are ephemeral; export captures the output as a standalone HTML brief.
- **Automated testing and CI** — appropriate for a production build, premature for a design-validation prototype.
