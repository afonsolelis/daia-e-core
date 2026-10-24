# DAIA-E guide

This guide is for the AI assistant and for the person who leads the project. The
CLI is the source of truth. Always start with `daia next --json`. The command
calculates the step from the current baselines and gates.

## Where to find each item

| Path | Content |
|---|---|
| `.daia/model/` | the project artifacts, one JSON file for each artifact, in any subfolder |
| `.daia/schemas/` | the schema of each artifact type |
| `.daia/agents/` | the 23 roles; read the file of the role before you produce an artifact |
| `.claude/skills/` or `.agents/skills/` | the skills for the runtime (Claude or Codex) |
| `.daia/evidence/` | the SP4 and SP5 reports |
| `.daia/baselines/` | the signed baselines; do not edit them manually |
| `.daia/config.json` | the configuration and the verification commands for each contract |

## How to produce an artifact

1. Run `daia next --json`. Read the skill that the command shows for the step.
2. Read the agent file of the role in `.daia/agents/`. For example, read `analyst.md` in SP1.
3. Read the schema of the type in `.daia/schemas/`.
4. Write the JSON file in `.daia/model/`. Each artifact has these fields:
   - a stable `id` with the prefix of the type (`STK-`, `BD-`, `PER-` and the other prefixes);
   - `kind`, `sprint` and `provenance`.
   If the AI wrote the draft, set `provenance` to `{"drafted_by": "ai-assisted"}`.
   Use the IDs for the references between artifacts.
5. Run `daia gate SP<n>`. Correct each finding that blocks. The message tells
   what is missing and which rule applies.
6. Run `daia verify SP<n>` to record the verification.
7. Show the result to the person. **Only the person approves the baseline.**
   Record the signature with `@rec` only after an explicit authorization.
   Use the name and the reason that the person gives.

## Path through the sprints

1. **SP1 — business** (`@analyst`, `@pm`, `@ux-design-expert`): stakeholders,
   concerns, business drivers with a hypothesis, personas with evidence, and
   business processes in BPMN. Each `.bpmn` file has one lane with the exact
   name of each persona. Also the IDEF0 decomposition from A0, the boundary
   (`automation`) and the enterprise view. `@val-biz` writes the review report.
2. **SP2 — requirements** (`@po`, `@pm`, `@qaw`): requirements that are
   elicited from the business processes and the IDEF0 activities. Each
   requirement has an `elicitation` (technique and sources) and a `priority`
   that the person decides. The quality scenarios have six parts and a real
   response measure. `@val-req` writes the review report.
3. **SP3 — architecture** (`@arch`, `@data-engineer`, `@atam`, `@spec`, `@test`):
   the static model and the dynamic model; the engineering view (a `deployment`
   model and a correspondence with the logical view); the technology view (a
   correspondence with the engineering view, and choices recorded as decisions
   with an alternative). The skills `evaluate-*-tactics` evaluate the
   architecture tactics. Also the specification and the test contracts in the
   red phase. `@val-eng` and `@val-tec` write the review reports. Run
   `daia verify SP3`.
4. **SP4 — implementation** (`@dev`, `@qa`, `@audit`, `@devops`): implement
   only after the approval of SP3. Run the tests. Write
   `.daia/evidence/quality-report.md` for each quality attribute, with
   measures, thresholds and limitations.
5. **SP5 — demonstration** (`@val`, `@devops`): write
   `.daia/evidence/validation.md` with the script, the hypothesis, the results
   and the limitations.

In each sprint, `@sm` removes the blockers and `@daia-master` tells which agent to use.

## Existing software

Before SP1, make a list of the existing code, integrations, tests and
documents. Record the origin and the uncertainties in
`.daia/evidence/recovery.md`. Recover the views with `status: recovered`. Ask
for a human review before you set `confirmed: true`. Keep the existing tests
green. Write the new contracts before you implement the change. Use
`--mode existing` in the onboarding.

## Test execution

In `.daia/config.json`, configure the commands for each contract, with no shell:

```json
{"verification":{"TC-example":{"command":"node","args":["--test","tests/example.test.js"],"inputs":["src/example.js","package.json"]}}}
```

`daia verify SP3` runs these commands and records the exit code, the output and
the fingerprints. In `inputs`, declare all the local files that have an effect
on the result. The test file and the model are included automatically. The
fingerprint does not cover external dependencies, services and omitted files.
Change `phase` only to agree with the observed result. A failure in the red
phase must have a review, because the exit code alone does not show if the
behavior is missing or if the test has an error.

## Changes after the signature

If you change an artifact that a signed baseline covers, `daia status` shows
"review necessary". If you undo the change, the signed state comes back. If you
keep the change, the person must approve again.

## Limits of the validation

The gate verifies the structure, the typed references, the files, the
traceability and the declared evidence. It does not certify full conformity
with ISO 42010. It does not interpret the semantics of every diagram. It does
not prove that an architecture is good. Use architecture tests as contracts for
executable constraints. Trade-offs, boundaries, fitness and results must have a
human review. The local signature records a declared approval. It does not
authenticate an identity.
