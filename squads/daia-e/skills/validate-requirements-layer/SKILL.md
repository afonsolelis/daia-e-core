---
name: validate-requirements-layer
description: Validate the SP2 elicitation layer. Make sure that each requirement has a technique and sources. Make sure that each functional requirement comes from a process or an IDEF0 activity. Make sure that a requirement covers each automated activity. Use before you show the SP2 baseline.
---

# Validate the SP2 elicitation layer

You examine. You do not make artifacts. If an artifact is not correct, send the finding back to the agent that made it. Do not correct the artifact. Basis: SWEBOK v4 ch. 1 §2 and SEBoK (Stakeholder Needs, System Requirements).

## Result

A review report in `.daia/evidence/review-requirements-layer.md` with: the verdict (`accepted`, `rejected` or `accepted with reservations`), the `ELI-*` findings of the gate, and the questions that need a human decision.

## Procedure

1. Run `daia gate SP2 --json`. Separate the findings with the `ELI-` prefix.
2. Examine the mechanical points:
   - Each requirement records `elicitation` with sources of the type persona, stakeholder, process or activity.
   - Each FR has a direct or indirect trace to BP or IDF.
   - Each IDEF0 leaf activity with `system` has an FR.
   - No requirement comes from an activity out of the boundary without a justification.
3. Read the model for the points that the gate does not interpret:
   - Do the requirements state the needs of the personas, or functions that somebody thinks are necessary?
   - Is there a conflict between sources that nobody solved?
4. Record the review report. If the gate blocks, the verdict is `rejected`.
5. If a critical reading finds a gap and the gate does not block, record a reservation.
6. Send the review report to the human. The review report does not replace the signature of the baseline.

If you must invent a source, evidence or an approval to complete the review report, stop.
