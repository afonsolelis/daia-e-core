# References of the bodies of knowledge

The local copies are in `docs/references/bok/` and are **not in version
control** (`.gitignore`). The licenses do not let us redistribute them:

| Local file | Work | License |
|---|---|---|
| `bok/babok-v3.pdf` | IIBA. *A Guide to the Business Analysis Body of Knowledge (BABOK Guide)*, v3, 2015 | IIBA member copy, no distribution |
| `bok/swebok-v4.pdf` | IEEE Computer Society. *Guide to the Software Engineering Body of Knowledge (SWEBOK Guide)*, v4.0, 2024 | Educational and personal use, no redistribution |
| `bok/sebok-v2.14.pdf` | BKCASE. *Guide to the Systems Engineering Body of Knowledge (SEBoK)*, v2.14 | CC BY-NC-ND 3.0 (Stevens parts) |
| `bok/taticas_arquiteturais_bass_clements_kazman.md` | Summary of the tactics of Bass, Clements & Kazman, *Software Architecture in Practice*, 3rd ed., 2013 (ch. 5–11) | Copyright of the book; local summary, no distribution |

To reproduce the environment, get each work from its official source. Save it
with the name in the table above.

## Where each work applies in the method

| Layer | Validator | Sections | Gate rules |
|---|---|---|---|
| Business (SP1) | `val-biz` | BABOK §10.43 Stakeholder List, Map, or Personas; §10.35 Process Modelling (BPMN, IDEF0); §4 Elicitation and Collaboration | `BIZ-PERSONA`, `BIZ-BPMN`, `BIZ-IDEF0`, `BIZ-DRIVER-PROCESS`, `BIZ-IDEF0-SPAN`, `BIZ-PERSONA-USED` |
| Elicitation (SP2) | `val-req` | SWEBOK v4 ch. 1 §2 Requirements Elicitation (§2.1 sources, §2.2 techniques), §7.3 Tracing; SEBoK Stakeholder Needs Definition, System Requirements Definition | `ELI-SOURCE`, `ELI-FROM-BUSINESS`, `ELI-ACTIVITY-COVERAGE`, `ELI-BOUNDARY` |
| Engineering (SP3) | `val-eng` | SEBoK Logical Architecture, Physical Architecture; RM-ODP Engineering viewpoint | `ENG-VIEW` |
| Technology (SP3) | `val-tec` | RM-ODP Technology viewpoint; SEBoK analysis of alternatives | `TEC-VIEW` |
| Tactics (SP3) | `evaluate-*-tactics` (seven skills, one for each attribute) | Bass, Clements & Kazman ch. 5–11 | `tactics` field in `ArchitectureDecision` |

The `evaluate-*-tactics` skills do not use the local file. Each skill loads the
tactic catalog of its attribute. The summary in `bok/` is for human reference.

The IDEF0 numbering and the range of 3 to 6 activities in each diagram follow
FIPS PUB 183 (1993). BABOK cites this standard as a scope notation.
