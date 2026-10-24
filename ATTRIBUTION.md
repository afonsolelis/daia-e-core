# Attribution and Lineage

DAIA-E is a derived work. This page records the complete chain, the parts that
DAIA-E kept and the parts that DAIA-E replaced. Article IV of the Constitution
(*Traceability & No Invention*) makes this record mandatory.

## Derivation chain

```
BMad Method (Brian Madison, BMad Code LLC, MIT)
      │  agile story-driven method for AI-assisted development
      ▼
Synkra AIOX (SynkraAI Inc., MIT) — v5.4.1
      │  agent orchestration framework, CLI First, squad architecture
      ▼
DAIA-E (Afonso Cesar Lelis Brandão, MIT) — this project
         baseline-driven method with an ISO/IEC/IEEE 42010 architecture description
```

The fork started from `SynkraAI/aiox-core@4ef6530f` (v5.4.1, 2026-08-15).

## What DAIA-E kept from AIOX

| Element | Status |
|----------|----------|
| Article I — CLI First | Kept completely, with an added justification |
| Article VI — Absolute Imports | Kept |
| Article XI — Squad-First Portability | Kept, with an added portability rule |
| Concept of the *squad* as a modular unit | Kept |
| Hierarchy CLI → Observability → UI | Kept |

## What DAIA-E replaced

| AIOX element | Replacement in DAIA-E | Reason |
|------------------|------------------------|-------|
| Article III — Story-Driven Development | Article III — Baseline-Driven Development | DAIA-E is not agile: the sprint is a unit of scope, not of time |
| Article II — Agent Authority | Article II — Human Decision Authority | The important authority is human. It is not distributed among agents |
| Document gates (checklists) | Executable gates in the CLI | A principle without an executable gate is only an aspiration |
| 35 agents, 204 tasks | DAIA-E squad of 23 agents, linked to sprints and *views*, that compose skills | Each agent answers a traceable concern |
| Pro layer (licensing, telemetry) | Removed | A research artifact cannot contain commercial licensing |
| 24 npm dependencies | Zero external dependencies | Reproducibility: the kernel runs without `npm install` |

## Code removed from the fork

`pro/`, `packages/`, `bin/`, `scripts/`, `.aiox-core/` (except the constitutions),
`docs/`, `tests/`, `squads/claude-code-mastery`, `outputs/`, `audits/`,
`governance/`, `compat/` and the runtime projections (`.codex/`, `.grok/`,
`.gemini/`, `.antigravity/`, `.cursor/`, `.kimi/`).

No AIOX code stays in DAIA-E, except the two constitutions in `.daia-core/`.
DAIA-E keeps them for the documentary traceability. The kernel, the CLI and the
squad are new code.

## Agents derived from AIOX

Each of the 12 agents in `.aiox-core/development/agents/` in
`SynkraAI/aiox-core@4ef6530f` (MIT) has a related agent in the squad. The texts
were written again with the DAIA-E agent contract. DAIA-E used the knowledge of
each role: principles, boundaries, procedures and frequent pitfalls. Each
derived agent ends with a `## Derivation from AIOX` section. This section
records the parts that DAIA-E kept, replaced and removed. The map is in
`lineage`, in `squad.json`. A test verifies that each target exists.

| aiox-core | DAIA-E |
|-----------|--------|
| `aiox-master` | `daia-master` |
| `analyst` | `analyst` |
| `architect` | `arch` |
| `data-engineer` | `data-engineer` |
| `dev` | `dev` |
| `devops` | `devops` |
| `pm` | `pm` |
| `po` | `po` |
| `qa` | `qa` |
| `sm` | `sm` |
| `squad-creator` | `squad-creator` |
| `ux-design-expert` | `ux-design-expert` |

DAIA-E did not bring these parts: the activation block (greeting, badges,
handoffs), the commands with the `*` prefix, the dependencies on tasks,
templates and scripts, the mandatory CodeRabbit integration and the AIOX Pro
commands. All of them depend on a runtime or on scripts. Article XI prohibits
this dependency.

## Foundation of the method

The DAIA-E method is adapted from:

> Brandão, A. C. L., Arakaki, R. & Silva, L. A. (2026). *An RM-ODP Method to
> Model PBL Digital Twins for Supporting Closed-Loop Supervision.* MethodsX
> (in press).

## Normative references

| Standard | Use |
|-------|-----|
| ISO/IEC/IEEE 42010:2022 | Metamodel of the architecture description |
| ISO/IEC 10746 (RM-ODP) | Default *viewpoint* catalog |
| ISO/IEC 25010:2023 | Product quality vocabulary |
| BABOK, SWEBOK v4, SEBoK | Bodies of knowledge for each sprint |
| QAW / ATAM (SEI) | Cyclic architecture evaluation |
