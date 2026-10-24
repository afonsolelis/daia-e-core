---
name: model-business-processes
description: Model the personas, the business processes in BPMN 2.0 and the IDEF0 functional decomposition before you elicit requirements. Use in SP1, after you identify the stakeholders and the business drivers.
---

# Model the business processes

Show how the work occurs now (or how it must occur), who does it, and which function it has. Basis: BABOK v3 §10.43 (Personas) and §10.35 (Process Modelling, BPMN and IDEF0 notations).

## Result

- `Persona` (`PER-*`) for each profile that does a process or receives its effect. Each persona links to `STK-*` and has goals and evidence of its origin.
- `Idef0Activity` (`IDF-*`) with the root `A0` and children numbered from the parent (`A1`, `A11`, and the next numbers). Each activity declares inputs, controls, outputs, mechanisms and `automation` (`system`, `manual` or `external`). The `automation` value marks the boundary of the system.
- `BusinessProcess` (`BP-*`) for each relevant process. Each process has a trigger, a result and the personas that do it. It also has the business drivers that it supports, the IDEF0 activity that it realizes and a `.bpmn` file (BPMN 2.0 XML).

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the `persona`, `process` and `idef0` schemas in `.daia/schemas/`.

1. Get the personas from the stakeholders and from the elicitation evidence. Do not invent profiles.
2. Write the `A0` context diagram. It shows the one function of the system of interest, with the full ICOM.
3. Decompose each level into 3 to 6 activities. Stop the decomposition when the boundary is clear.
4. For each process, draw the BPMN diagram. Give it one `lane` for each persona that does the process.
5. Give each lane the exact name of its persona.
6. Put a start event, the activities, the flows and an end event in the BPMN diagram.
7. Link the process to the IDEF0 activity (`activity`) and to the business drivers (`supports`).
8. Run `daia gate SP1`. Correct the blocking `BIZ-*` findings.

If a process uses a persona whose origin you cannot verify, stop. If the BPMN diagram starts to show screens or components, stop. That is a solution, not the business.
