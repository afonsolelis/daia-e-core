---
name: validate-business-layer
description: Validate the SP1 business layer. Examine the personas, the BPMN with one lane for each persona, the coherence of the IDEF0 model and the business drivers that the processes support. Use before you show the SP1 baseline to the human.
---

# Validate the SP1 business layer

You examine. You do not make artifacts. If an artifact is not correct, send the finding back to the agent that made it. Do not correct the artifact. Basis: BABOK v3 §10.35 and §10.43.

## Result

A review report in `.daia/evidence/review-business-layer.md` with: the verdict (`accepted`, `rejected` or `accepted with reservations`), the `BIZ-*` findings of the gate, and the questions that need a human decision.

## Procedure

1. Run `daia gate SP1 --json`. Separate the findings with the `BIZ-` prefix.
2. Examine the mechanical points:
   - Each persona comes from a stakeholder and has evidence.
   - Each process has a BPMN diagram that a person can read.
   - Each BPMN diagram has a start, activities, a flow, an end and one lane for each persona.
   - The IDEF0 model has the root A0, coherent numbers, the full ICOM and 3 to 6 children at each level.
   - A process supports each business driver.
3. Read the model for the points that the gate does not interpret:
   - Does the modelled process agree with the real work in the sources?
   - Did the human decide the boundaries (`automation`)?
4. Record the review report. If the gate blocks, the verdict is `rejected`.
5. If a critical reading finds a gap and the gate does not block, record a reservation.
6. Send the review report to the human. The review report does not replace the signature of the baseline.

If you must invent a source, evidence or an approval to complete the review report, stop.
