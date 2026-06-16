# GRC Intelligence Engine

A React prototype that turns a plain-language description of a technology initiative into a sourced, auditor-ready governance package: risks rated for inherent and target-residual exposure, mapped controls with owners, implementation checklists, audit testing procedures, framework mapping, and a recommended governance document set across five tiers.

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

To enable the optional AI layer, copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
# Edit .env and add your key
```

## Knowledge library coverage

The current library (v0.2.0) covers:

- **22 risks** across 7 domains: Technology, Cybersecurity, Data Security & Privacy, Third-Party Risk, Compliance, AI Governance, and Resilience
- **31 controls** with implementation steps and audit testing procedures for each
- **7 system archetypes**: SaaS Financial/ERP, Payments/CDE, AI/GenAI, General SaaS, Data Platform, Infrastructure Change, Physical Site Outage/DR
- **Framework references** to SOX ITGC, PCI DSS 4.0, NIST CSF 2.0, ISO 27001:2022, NIST 800-53, ISO 22301, NIST AI RMF, ISO 42001, EU AI Act, GDPR, and CCPA/CPRA
- **27 governance documents** across 5 tiers (charters, policies, standards, procedures, guidelines)

## Disclaimer

This project was built independently as personal R&D. It uses only publicly available frameworks (NIST, PCI SSC, ISO references) and synthetic example scenarios. It contains no confidential or employer-proprietary information — no internal policies, control libraries, risk registers, vendor names, or assessment data from any employer past or present.

All output is decision-support material. It does not constitute a professional opinion, audit opinion, QSA assessment, or legal advice.

## Not in scope

The following were deliberately left out of this prototype to keep focus on the core design thesis:

- **Incident response and event management** — different domain, different data model
- **Deployment and hosting** — this is a local-first prototype, not a SaaS product
- **System integrations** — no ServiceNow, OneTrust, or SIEM connectors; the value proposition is the knowledge graph, not the plumbing
- **User authentication and multi-tenancy** — out of scope for a single-user prototype
- **Persistent storage** — assessments are ephemeral; export captures the output
- **Automated testing and CI** — appropriate for a production build, premature for a design validation prototype
