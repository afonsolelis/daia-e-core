# DAIA-E Constitution

> **Version:** 1.0.0 | **Ratified:** 2026-09-09
> Translated to English (STE) on 2026-10-23. The meaning of the articles did not change.
> **Derived from:** Synkra AIOX Constitution v1.1.0 (MIT), which is derived from the BMad Method
> **Method adapted from:** Brandão, A. C. L., Arakaki, R. & Silva, L. A. (2026). *An RM-ODP Method to Model PBL Digital Twins for Supporting Closed-Loop Supervision.* MethodsX (in press).

This document gives the non-negotiable principles of **DAIA-E**, *specification-driven, AI-assisted development*. All agents, tasks and workflows MUST obey these principles. Executable gates in the CLI block the violations. A documentary checklist does not block them.

---

## Derivation from AIOX

DAIA-E does not break with AIOX. It keeps the parts that are neutral about the method. It replaces the parts that are specific to agile, *story-driven* development.

| Article | Origin | Status |
|--------|--------|----------|
| I — CLI First | AIOX I | **Kept** without change |
| II — Human Decision Authority | AIOX II (Agent Authority) | **Rebuilt**: the authority moves from the agent to the human |
| III — Baseline-Driven Development | AIOX III (Story-Driven) | **Replaced**: the unit is the baseline, not the story |
| IV — Traceability & No Invention | AIOX IV | **Kept and expanded** |
| V — Quality as Specified Scenario | AIOX V (Quality First) | **Expanded**: adds ISO/IEC 25010:2023 |
| VI — Absolute Imports | AIOX VI | **Kept** (a technical rule, neutral about the method) |
| VII — Architectural Description | — | **New** (ISO/IEC/IEEE 42010:2022) |
| VIII — Specification Before Generation | — | **New** (the central thesis of the method) |
| IX — Recorded Alternative | — | **New** (analysis of alternatives, SEBoK) |
| X — Body of Knowledge Anchoring | — | **New** (BABOK, SWEBOK, SEBoK) |
| XI — Squad-First Portability | AIOX XI | **Kept** without change |
| XII — Model Governance | AIOX XII | **Adapted**: *story binding* becomes *baseline binding* |

---

## Core Principles

### I. CLI First (NON-NEGOTIABLE)

The CLI is the source of truth. All execution, validation and automation occur in the CLI.

**Rules:**
- MUST: Each new function works 100% through the CLI before any UI exists
- MUST: Dashboards only observe. They NEVER control or make decisions
- MUST: The operation of the system NEVER needs the UI
- MUST: **The CLI can run each gate** without the hooks of an IDE

**Reason added by DAIA-E:** the hooks are not equal across IDEs. Cursor and GitHub Copilot do not have equivalent *lifecycle hooks*. A gate that uses a hook cannot apply in half of the environments. A gate in the CLI is the only way for the method to apply in every runtime. This is also true when an LLM with no tools leads the work.

**Gate:** `daia gate` — BLOCK

---

### II. Human Decision Authority (NON-NEGOTIABLE)

Generative AI helps to produce artifacts in **all** sprints. The method does not limit AI participation to one moment. The decisions stay deliberate because a recorded human decision closes each baseline.

**Rules:**
- MUST: No baseline closes without a recorded and signed human decision
- MUST: The signature records who decided, when, and on which state of the model (hash)
- MUST NOT: An agent closes a baseline, signs for a human or infers approval from silence
- MUST: The AI CAN write, propose and suggest any artifact, also the business drivers
- MUST: When a task is outside the scope of its *view*, an agent delegates the task

**Difference from AIOX:** AIOX gives authorities to agents (only `@devops` can `git push`). In DAIA-E, agents do not share the important authority. The human keeps it, and it applies to the closure of a baseline.

**Gate:** `daia baseline sign` — BLOCK

---

### III. Baseline-Driven Development (NON-NEGOTIABLE)

The development has five sprints. A sprint is a **unit of scope, not a unit of time**. A baseline closes each sprint.

| Sprint | Key question | Baseline at the end |
|--------|------------------------|--------------------------|
| **SP1 — BIZ** | Why must the system exist, and for whom? | Business model: personas, business processes in BPMN, IDEF0 decomposition, business drivers, stakeholder map, hypothesis |
| **SP2 — REQ** | What must the system do, and with which quality? | Requirements elicited from the business: FR, NFR as six-part scenarios, traceability matrix |
| **SP3 — ST** | How will the system be structured, and why? | Architecture: technical specification, skeleton, specification documents, tests in the red phase |
| **SP4 — IMPL** | Does the decided structure work in practice? | Executable: code, tests in the green phase, quality report for each characteristic |
| **SP5 — DEMO** | Is the initial hypothesis confirmed? | Release that can be demonstrated: script, evidence, metrics and declared limitations |

**Rules:**
- MUST: No artifact of a sprint is produced before the previous baseline is closed
- MUST: Each baseline records the state of the model at the time of closure
- MUST NOT: A sprint is NOT a unit of time. A deadline does not close a baseline
- MUST NOT: No product code is written before the SP3 baseline

**Explicit replacement:** DAIA-E **is not** *story-driven*. Code does not need an associated story. The unit of traceability is the chain stakeholder need → requirement → architecture decision → test. It is not the backlog card.

**Gate:** `daia gate sp{1..5}` — BLOCK

---

### IV. Traceability & No Invention (MUST)

Specifications do not invent. They only derive. Each derivation has a trace in the two directions.

**Rules:**
- MUST: Each specification statement has a trace to a verified FR-*, NFR-*, CON-* constraint or BD-* business driver
- MUST: The chain stakeholder need → system requirement → software requirement → architecture decision stays navigable
- MUST NOT: Add functions that are not in the requirements
- MUST NOT: Accept implementation details that nobody researched, or specify technologies that nobody validated
- MUST: At least one `View` addresses each identified `Concern`

**Reason added:** in LLM-assisted development, invention is not an accident. The model fills gaps with a statistical pattern. Bidirectional traceability makes invention detectable.

**Gate:** `daia trace --strict` — BLOCK

---

### V. Quality as Specified Scenario (MUST)

Quality is not an adjective. It is a measurable scenario. The measurement is verified, not only stated.

**Rules:**
- MUST: Each NFR is a **six-part scenario**: source, stimulus, artifact, environment, response and response measure
- MUST: Each scenario refers to at least one ISO/IEC 25010:2023 characteristic as vocabulary
- MUST: Each quality scenario has at least one executable test that verifies it
- MUST: The verifications that apply to the project pass without error
- MUST: In this library, run `npm run check` and `npm test`. For the package, run `npm run pack:check`
- MUST: Compilation and type checks apply only when the project configures them
- MUST: The SP4 quality report is organized **by characteristic**, not by file
- SHOULD: The test coverage does not decrease between baselines

**Difference from AIOX:** AIOX defines quality with tool checks (lint, typecheck, test, build). DAIA-E keeps these checks. It adds the missing axis: quality that is **specified** and has a trace to the normative vocabulary.

**Gate:** `daia gate sp4` — BLOCK

---

### VI. Absolute Imports (SHOULD)

Relative imports increase the coupling and make refactoring difficult.

**Rules:**
- SHOULD: Always use absolute imports with the `@/` alias
- SHOULD NOT: Use relative imports (`../../../`)
- EXCEPTION: Imports in the same module CAN be relative

**Gate:** ESLint — INFO

---

### VII. Architectural Description (NON-NEGOTIABLE)

The architecture description follows the framework of **ISO/IEC/IEEE 42010:2022**. The framework sets the relations between stakeholder, concern, *viewpoint*, *view* and correspondence between *views*.

**What the standard gives and what it does not give:** 42010 defines the **metamodel** of the architecture description. Each *view* must answer identified concerns of identified stakeholders. But the standard **does not tell which views must exist**. The project decides the concrete set.

**Rules:**
- MUST: Each `View` declares the `Stakeholder` and the `Concern` items that it answers
- MUST: At least one `View` addresses each recorded `Concern`
- MUST: The correspondences between *views* are declared and verified
- MUST: The correspondences keep the description from a split into documents that do not agree with each other
- MUST: The *viewpoint* catalog is **pluggable**. The default is RM-ODP (ISO/IEC 10746)
- MUST: The architecture description **is not the artifact of one sprint**. It starts in SP1 and is complete in SP4

**Default catalog — RM-ODP:**

| View | Concern that it answers | Sprint |
|------|--------------------------|--------|
| *Enterprise* | Who the stakeholders are, which policies control the domain, which objective the system serves | SP1 |
| *Information* | Which entities exist, how they relate, and under which constraints | SP2, SP3 |
| *Computational* | How the system divides into units and how the units interact | SP3 |
| *Engineering* | How the solution is distributed, persisted and deployed | SP3 |
| *Technology* | Which concrete products implement the decided mechanism | SP3, SP4 |

**Gate:** `daia gate sp3` — BLOCK

---

### VIII. Specification Before Generation (NON-NEGOTIABLE)

The internal order of the method is deliberate: **the specifications come before the tests, and the tests come before the implementation.**

**Rules:**
- MUST: Before any architecture decision, make two models: the **static** model and the **dynamic** model
- MUST: The static model shows what exists: entities, attributes and relations
- MUST: The dynamic model shows what occurs: flows, sequences and state transitions
- MUST: The tests that lock the behavioral contracts exist in the red phase before the generation starts
- MUST NOT: No product code is generated before the SP3 baseline is closed
- MUST: An executable test can examine the output of the generative model immediately

**Reason:** an architecture decision without a static model often gives structures that do not hold the real data. Without a dynamic model, the structures are correct at rest but not correct in operation.

**Gate:** `daia gate sp3`, `daia gate sp4` — BLOCK

---

### IX. Recorded Alternative (MUST)

Each relevant architecture decision records at least one alternative that the team examined. It also records the criterion that rejected the alternative.

**Rules:**
- MUST: Each `AD` (architecture decision) records ≥1 examined alternative and the criterion of the rejection
- MUST: Each `AD` has a trace to ≥1 requirement or concern that is its reason
- MUST: The architecture evaluation is **a cycle**: QAW between SP2 and SP3, ATAM in SP3, and a reevaluation loop in SP4
- MUST: In SP4, ATAM opens again only for the affected quality scenarios

**Reason:** this rule is especially important in LLM-assisted development. The model tends to go to conventional solutions and does not tell that other solutions existed.

**Gate:** `daia gate sp3` — BLOCK

---

### X. Body of Knowledge Anchoring (MUST)

Each sprint is anchored in the body of knowledge that agrees with its key question.

| Sprint | Body of knowledge |
|--------|----------------------|
| SP1 | **BABOK** — business analysis: personas (§10.43), BPMN and IDEF0 (§10.35) |
| SP2 | **SWEBOK** (elicitation) and **SEBoK** (stakeholder needs → system requirements), with ISO/IEC 25010:2023 as vocabulary |
| SP3 | **SEBoK** and SWEBOK, with RM-ODP as the *viewpoint* framework |
| SP4 | **SWEBOK** — Construction, Testing and Quality Management |
| SP5 | **SEBoK** — verification and validation |

**Rules:**
- MUST: Each agent declares its BoK and the *view* that it fills
- MUST: The system boundary is a **recorded project decision**, not an observation
- MUST: The boundary sets what is implemented, what is simulated, what stays external and what is out of scope
- SHOULD: Differences between BoKs are recorded, not hidden

**Gate:** `daia gate sp{1..5}` — WARN

---

### XI. Squad-First Portability (NON-NEGOTIABLE)

`squads/` is the source of truth for the executable artifacts. The runtime projections (`.claude/`, `.codex/`, `.gemini/`, `.grok/`) are **derived, never canonical**.

**Rules:**
- MUST: The scripts, templates, data and checklists of a squad are under `squads/{squad}/`
- MUST: IDE projections contain only frontmatter and instructions, **not** hidden executable logic
- MUST: The synchronization direction is always `squads/` → projection, never the opposite
- MUST: Executable artifacts work in every runtime that calls them
- MUST: **The source agent definition is pure markdown + YAML**, with no IDE path, script call or permission badge
- MUST: A human can read the source agent definition. Any LLM can read it

**Portability hierarchy:**
```
squads/daia-e/ (SOT) → .claude/ → .codex/ → .gemini/ → .grok/ → future runtimes
```

**Reason:** artifacts that are in the folder of one IDE stay locked to that host. The value is in the process, not in the tool.

**Text standard:** all squad and kernel text is in English STE, as [`docs/ste/README.md`](../docs/ste/README.md) specifies.

**Gate:** synchronization validators — WARN

---

### XII. Model Governance (MUST)

When automation uses a model, the access MUST obey budget limits, routing authority, baseline binding and intent scans.

**Rules:**
- MUST: Each auto-dispatch loop declares a budget limit before the first call
- MUST: A change to the routing configuration must have a review by `@arch` (PR)
- MUST: **Baseline binding**: auto-dispatched work has a link to a valid sprint and baseline
- MUST NOT: Anonymous auto-dispatch of product code (shadow work)
- MUST: A scan for prompt injection examines each intent from automation before the system processes it

**Adaptation:** AIOX gives a link to a *story* (XII-C). In DAIA-E the link is to the **baseline**, in agreement with Article III.

**Gate:** permission and pre-dispatch gates — BLOCK

---

## Governance

### Amendment Process

1. Write a proposal with the reason and a trace to the published method
2. `@arch` and `@rec` review the proposal
3. The approval must have a **recorded human decision** (Article II)
4. Implement the change and update the version
5. Propagate the change to the templates, tasks and runtime projections

### Versioning

- **MAJOR:** Removal of a principle, or a redefinition that is not compatible
- **MINOR:** A new principle or a significant expansion
- **PATCH:** Clarifications and text corrections

### Gate Severity Levels

| Severity | Behavior | Use |
|------------|---------------|-----|
| BLOCK | Stops the execution, exit ≠ 0 | NON-NEGOTIABLE, critical MUST rules |
| WARN | Continues with a warning | MUST rules that are not critical |
| INFO | Only reports | SHOULD |

**Enforcement principle:** a gate is code, not a checklist. A principle without an executable gate is an aspiration, not a constitution.

---

## Normative References

| Reference | Use in the method |
|-----------|---------------|
| ISO/IEC/IEEE 42010:2022 | Metamodel of the architecture description (Art. VII) |
| ISO/IEC 10746 (RM-ODP) | Default *viewpoint* catalog (Art. VII) |
| ISO/IEC 25010:2023 | Vocabulary of product quality (Art. V) |
| BABOK | Business analysis, SP1 (Art. X) |
| SWEBOK v4 | Requirements, construction, tests, quality (Art. X) |
| SEBoK | System perspective, V&V (Art. X) |
| QAW / ATAM (SEI) | Architecture evaluation as a cycle (Art. IX) |

---

*DAIA-E Constitution v1.0.0*
*CLI First | Baseline-Driven | Human Decision Authority | Specification Before Generation | Squad-First Portability*
