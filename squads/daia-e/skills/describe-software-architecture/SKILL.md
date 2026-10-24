---
name: describe-software-architecture
description: Make an ISO 42010 architecture description with views, models, correspondences, decisions and alternatives. Use to design or to recover a software architecture.
---

# Describe the software architecture

The active catalog sets the concrete views. ISO 42010 sets the relations that must stay consistent.

## Result

Make views in `.daia/model/views`, decisions in `decisions` and correspondences in `correspondences`. Include a minimum of one static model and one dynamic model. Address each concern. For each important decision, record the rejected alternative and the criterion.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` at the applicable step.

1. Read the SP2 baseline and the prioritized drivers.
2. Run `daia viewpoints`.
3. Declare the boundary of the system.
4. Model the entities and relations before the flows and states.
5. Make only the views that are necessary. Link each view to its stakeholders and concerns.
6. Record correspondences between views that you can verify.
7. For each decision, record the motivation, the alternative, the criterion, the risks and the affected views.
8. Run `daia gate SP3`.
9. Send the trade-offs to the evaluation. Send the contracts to the specification.

Do not write product code before the human signs the SP3 baseline.
