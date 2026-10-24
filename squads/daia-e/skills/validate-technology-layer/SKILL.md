---
name: validate-technology-layer
description: Validate the SP3 technology layer. Examine the technology view that corresponds to the engineering view, and make sure that each technology choice is a decision with an alternative. Use after you validate the engineering layer.
---

# Validate the SP3 technology layer

You examine. You do not make artifacts. If an artifact is not correct, send the finding back to the agent that made it. Do not correct the artifact. Basis: RM-ODP Technology and SEBoK (analysis of alternatives).

## Result

A review report in `.daia/evidence/review-technology-layer.md` with: the verdict (`accepted`, `rejected` or `accepted with reservations`), the `TEC-*` findings of the gate, and the questions that need a human decision.

## Procedure

1. Run `daia gate SP3 --json`. Separate the findings with the `TEC-` prefix.
2. Examine the mechanical points:
   - A `technology` view exists.
   - The technology view has a correspondence (COR-*) with the engineering view.
   - Each technology choice is an AD with `affects_views` on the technology view.
   - Each technology AD has a rejected alternative with a criterion.
3. Read the model for the points that the gate does not interpret:
   - Did the team select the technology because the engineering needs it, or because the team knows it?
   - Was the rejected alternative a real option?
4. Record the review report. If the gate blocks, the verdict is `rejected`.
5. If a critical reading finds a gap and the gate does not block, record a reservation.
6. Send the review report to the human. The review report does not replace the signature of the baseline.

If you must invent a source, evidence or an approval to complete the review report, stop.
