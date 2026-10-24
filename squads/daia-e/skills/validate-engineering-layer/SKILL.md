---
name: validate-engineering-layer
description: Validate the SP3 engineering layer. Examine the engineering view with a deployment model, its correspondence with the logical model, and the decisions that have a trace to requirements. Use after the computational and information views and before the technology.
---

# Validate the SP3 engineering layer

You examine. You do not make artifacts. If an artifact is not correct, send the finding back to the agent that made it. Do not correct the artifact. Basis: SEBoK (Logical and Physical Architecture) and RM-ODP Engineering.

## Result

A review report in `.daia/evidence/review-engineering-layer.md` with: the verdict (`accepted`, `rejected` or `accepted with reservations`), the `ENG-*` findings of the gate, and the questions that need a human decision.

## Procedure

1. Run `daia gate SP3 --json`. Separate the findings with the `ENG-` prefix.
2. Examine the mechanical points:
   - An `engineering` view with a `deployment` model exists.
   - The engineering view has a correspondence (COR-*) with a computational view or an information view.
   - A minimum of one AD that affects the engineering view has a trace to FR, NFR or QS.
3. Read the model for the point that the gate does not interpret: do the nodes, channels and policies answer the quality scenarios? Or do they only repeat a conventional topology?
4. Record the review report. If the gate blocks, the verdict is `rejected`.
5. If a critical reading finds a gap and the gate does not block, record a reservation.
6. Send the review report to the human. The review report does not replace the signature of the baseline.

If you must invent a source, evidence or an approval to complete the review report, stop.
