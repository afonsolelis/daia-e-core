---
name: evaluate-architecture-tradeoffs
description: Evaluate architecture decisions for sensitivity points, trade-offs and risks. Open again only the scenarios that a change affects. Use in ATAM or in impact analysis.
---

# Evaluate architecture trade-offs

Show the consequences. The decision stays with the architect. The acceptance of the decision stays with the human.

## Result

Fill in `sensitivity_points`, `tradeoff_points` and `risks` of the decisions. In maintenance, make the subset of scenarios that you must evaluate again.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` at the applicable step.

1. Relate each decision to the priority scenarios that it has an effect on.
2. Find the parameters that change quality attributes when they change.
3. Record where an improvement to one attribute makes another attribute worse.
4. Describe the observable risk of each trade-off.
5. If the change is to an existing decision, run `daia impact <AD-id>`.
6. Evaluate again only the scenarios in the scope that the command returns.
7. Send incomplete decisions back to the architect. Do not select the alternative for the architect.
