---
name: evaluate-availability-tactics
description: Evaluate if the decisions for reliability scenarios apply the tactics to detect faults, recover from faults and prevent faults (Bass, Clements & Kazman, chapter 5). Use in SP3 and in the SP4 ATAM evaluation when there are scenarios with characteristic reliability.
---

# Evaluate the availability tactics

Show the gaps and the consequences. Do not select the tactic for the architect.

## Result

In each `ArchitectureDecision` that you evaluate, complete:

- `tactics`: the tactics that the decision applies, in the format `availability/<tactic>`.
- `sensitivity_points` and `tradeoff_points`, with the known trade-offs below.
- `risks`: the gaps that depend on an existing decision.

Tell the human about the scenarios that have no decision. Also tell the human about the decisions that do not state their tactic explicitly.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`.

1. Select the `QualityScenario` items with `characteristic` `reliability`. The sub_characteristic is faultlessness, availability, fault tolerance or recoverability.
2. Start with the scenarios that have importance H in the `utility_tree`. If there is no `utility_tree`, evaluate all scenarios and report that they have no priority. If there are no scenarios, do not use this skill.
3. Read the decisions that have each scenario in `traces_to`. A scenario without a decision is a gap for `@arch`. Do not make the decision.
4. Record in `tactics` only the tactics that the decision text applies explicitly.
5. If the decision names a pattern, record its tactic only when the text makes it clear. If you have a doubt, ask `@arch`.
6. Answer the verification questions of the families that apply to the stimulus of the scenario.
7. The catalog is not a checklist. A tactic that is not there is a gap only when the scenario needs it.
8. Go through the design checklist of §5.3 in its seven categories: allocation of responsibilities, coordination model, data model, mapping among architectural elements, resource management, binding time and choice of technology.
9. In SP4, run `daia impact <AD-id>`. Evaluate again only the listed scenarios.
10. Send the gaps to `@arch`. Record the result with `daia verify` at the applicable step.

## Catalog

**Detect faults**

| Tactic | Verification question |
|---|---|
| `ping-echo` | Is there a reachability test between nodes, with a defined timeout? |
| `monitor` | Is there a component that monitors the health of processes, resources and the network? |
| `heartbeat` | Does the monitored component send a periodic signal, or does it reset a watchdog? |
| `time-stamp` | Does the system detect an incorrect sequence of events in messages? |
| `sanity-checking` | Does the system validate the outputs of operations against the design knowledge? |
| `condition-monitoring` | Does the system verify the invariants of the process (for example, checksums)? |
| `voting` | For critical failures, is there redundancy with a voter? Which type: replication, functional redundancy or analytic redundancy? |
| `exception-detection` | Does the system detect system exceptions, parameter exceptions and timeout exceptions? |
| `self-test` | Do critical components have a self-test? Does the component or the monitor start it? |

**Recover from faults**

| Tactic | Verification question |
|---|---|
| `active-redundancy` | Does the necessary failover time accept a hot spare? |
| `passive-redundancy` | Is a warm spare with periodic checkpoints sufficient? |
| `spare` | Does the scenario accept a recovery by a restart (cold spare)? |
| `exception-handling` | Does the system handle exceptions, and not only send them up until a failure occurs? |
| `rollback` | Are there checkpoints to go back to a good state? |
| `software-upgrade` | Is there a plan to upgrade without a service interruption (ISSU)? |
| `retry` | Does the system retry transient failures, with a limit? |
| `ignore-faulty-behavior` | Does the system ignore messages from spurious sources (for example, an ACL against DoS)? |
| `degradation` | Do the critical functions continue to operate when the other functions stop? |
| `reconfiguration` | Does the system give the responsibilities again to the resources that remain? |
| `shadow` | Does a repaired component operate in shadow mode for a period before it becomes active again? |
| `state-resynchronization` | After a repair, does the system resynchronize the state? |
| `escalating-restart` | Does the restart granularity increase with the severity of the fault? |
| `non-stop-forwarding` | If the control plane restarts, does the data plane continue to operate? |

**Prevent faults**

| Tactic | Verification question |
|---|---|
| `removal-from-service` | Is there a periodic rejuvenation that removes latent faults? |
| `transactions` | Do concurrent updates have ACID semantics (for example, two-phase commit)? |
| `predictive-model` | Do operational parameters predict failures before they occur? |
| `exception-prevention` | Are there protections against predictable exceptions (limits, smart pointers)? |
| `increase-competence-set` | Can the system handle the cases that now cause an exception as part of normal operation? |

## Known trade-offs

- Availability against cost: active redundancy costs much. A cold spare costs little, but it is slow.
- Availability against evolution: strict parameter typing makes changes to the format difficult.

## Does not do

- It does not make a reliability scenario that is not in the requirements (Art. IV).
- It does not recommend a tactic without a scenario that justifies it.
