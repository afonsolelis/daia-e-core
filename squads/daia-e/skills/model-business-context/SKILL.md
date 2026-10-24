---
name: model-business-context
description: Model the business context, the stakeholders, the concerns, the boundary and the hypothesis before you write requirements or select a technology. Use when you start or recover the architecture of a system.
---

# Model the business context

Find why the system exists, for whom, and in which boundary. Do not change solutions that you think are correct into stakeholder needs.

## Result

Make the `BusinessDriver`, `Stakeholder` and `Concern` artifacts and the `enterprise` view in `.daia/model/`. Give each statement a trace to the evidence that you received. Record a minimum of one hypothesis that SP5 can examine.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` in the applicable step.

1. Make sure that `daia init` initialized the project.
2. Identify the stakeholders by role.
3. Elicit the concerns of each stakeholder as questions or tensions.
4. Get business drivers that you can verify from the concerns.
5. Record the boundary: implemented, simulated, external and out of scope.
6. Relate the enterprise view to the concerns and to the stakeholders.
7. Run `daia gate SP1`. Do not sign the baseline for the user.

If you cannot show the origin of a statement, stop. If somebody makes a technical choice too early, stop.
