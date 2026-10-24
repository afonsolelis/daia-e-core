---
name: prioritize-architecture-drivers
description: Prioritize quality scenarios by importance and difficulty to find the architecture drivers. Use between the requirements and the architecture decisions.
---

# Prioritize the architecture drivers

Help a QAW on scenarios that already have a specification. Do not make scenarios to fill gaps. Do not select the solution.

## Result

In each scenario, fill in `utility_tree.importance` and `utility_tree.difficulty` with `H`, `M` or `L`. Give the ordered list to the architecture. Show the `(H,H)` combinations clearly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` at the applicable step.

1. Make sure that the scenarios passed the SP2 gate.
2. Get the importance from the stakeholders.
3. Get the difficulty from the technical participants.
4. Record each disagreement. Do not calculate an artificial consensus.
5. Question the `(L,L)` scenarios.
6. Show the `(H,H)` scenarios as drivers.
7. Send the gaps to the owner of the requirements. Send the priorities to the architect.
