---
name: evaluate-usability-tactics
description: Evaluate if the decisions for usability scenarios support the user initiative and the system initiative (Bass, Clements & Kazman, chapter 11). The user interface must be separate from the logic. Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic interaction_capability.
---

# Evaluate the usability tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `usability/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `interaction_capability`. ISO/IEC 25010:2023 uses this name for the old usability characteristic.
2. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
3. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
4. Verify if the user interface is separate from the logic (for example, MVC, PAC or Seeheim).
5. If the user interface is not separate, record a gap. The tactics below depend on this separation. The separation uses the modifiability tactics.
6. Record in `tactics` only the tactics that the decision text applies explicitly. If you have a doubt, ask `@arch`.
7. For each long, destructive or automatic operation in the scenario, answer the verification questions.
8. A tactic that is not there is a gap only when the scenario needs it.
9. Go through the design checklist of §11.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
10. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
11. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

**Support user initiative**

| Tactic | Verification question |
|---|---|
| `cancel` | Can the user cancel long operations? Does the cancel release the resources and tell the collaborators? |
| `undo` | Is there sufficient state to restore the previous state, through a snapshot or a reversible operation? |
| `pause-resume` | Can the user pause long operations and resume them? |
| `aggregate` | Can the user do repetitive operations on many objects as one group? |

**Support system initiative**

| Tactic | Verification question |
|---|---|
| `maintain-task-model` | Does the system know the task of the user, to give help for the context? |
| `maintain-user-model` | Does the system model the knowledge and the behavior of the user, with explicit customization? |
| `maintain-system-model` | Does the system predict its own behavior to inform the user (for example, the time that remains)? |

## Known trade-offs

- Usability against security: confirmations and new authentication add friction.
- Usability against performance: undo must keep state. User models cost computation.
- Usability against modifiability: a separate user interface needs more layers and interfaces.

## Does not do

- It does not make an interaction flow that is not in the scenarios (Art. IV).
- It does not recommend a tactic without a scenario that justifies it.
