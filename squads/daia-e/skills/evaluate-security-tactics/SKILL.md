---
name: evaluate-security-tactics
description: Evaluate if the decisions for security scenarios apply the security tactics (Bass, Clements & Kazman, chapter 9). The tactics detect, resist, react to and recover from attacks. Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic security.
---

# Evaluate the security tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `security/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `security`.
2. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
3. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
4. In each scenario, find the actor, the asset and the entry surface.
5. Record in `tactics` only the tactics that the decision text applies explicitly.
6. If the decision names a mechanism (for example, OAuth or TLS), record its tactic only when the text makes it clear. If you have a doubt, ask `@arch`.
7. Answer the verification questions of the families that apply to the stimulus of the scenario. A tactic that is not there is a gap only when the scenario needs it.
8. Go through the design checklist of §9.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
9. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
10. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

**Detect attacks**

| Tactic | Verification question |
|---|---|
| `detect-intrusion` | Does the system compare request patterns with known attack signatures? |
| `detect-service-denial` | Does the system compare the input traffic with denial-of-service profiles? |
| `verify-message-integrity` | Do messages, configuration files and deploy artifacts have a checksum or a hash that the system verifies? |
| `detect-message-delay` | Does the system detect abnormal changes in the delivery time? |

**Resist attacks**

| Tactic | Verification question |
|---|---|
| `identify-actors` | Does each external input have an identified source? |
| `authenticate-actors` | Does the authentication mechanism agree with the risk of the scenario? |
| `authorize-actors` | Does the system verify permissions for each actor, group or role? |
| `limit-access` | Are there firewalls, a DMZ or restrictions on ports and protocols? |
| `limit-exposure` | Are the critical resources divided and distributed, so that one weakness cannot compromise all of them? Are facts about the system hidden (for example, the number of entry points)? |
| `encrypt-data` | Is the data encrypted at rest and in transit? |
| `separate-entities` | Is sensitive data separate from data that is not sensitive (server, VM, air gap)? |
| `change-default-settings` | Does the system force a change of the default settings? |

**React to attacks**

| Tactic | Verification question |
|---|---|
| `revoke-access` | Can the system quickly revoke access to sensitive resources when there is a suspicion? |
| `lock-computer` | Do repeated login attempts lock the source for a time window? |
| `inform-actors` | Does the system notify the operators and the systems that cooperate with it? |

**Recover from attacks**

| Tactic | Verification question |
|---|---|
| `maintain-audit-trail` | Does the system record user actions and system actions in an auditable form? |
| `restore` | Does the system restore the compromised service? Evaluate the recovery tactics with `evaluate-availability-tactics`. |

## Known trade-offs

- Security against usability: authentication adds friction.
- Security against performance: encryption and integrity verification cost cycles.
- Security against interoperability: exposed interfaces make the attack surface larger.

## Does not do

- It does not make a security requirement that is not in the requirements (Art. IV).
- It does not recommend a tactic without a scenario that justifies it.
