---
name: elicit-requirements-from-business
description: Elicit requirements from the personas, the BPMN processes and the IDEF0 activities of the SP1 baseline. Record the technique and the sources. Use in SP2 before you write quality scenarios.
---

# Elicit requirements from the business

Change the signed business model into stakeholder needs and requirements that you can verify. Basis: SWEBOK v4 ch. 1 (§2 Requirements Elicitation: sources and techniques) and SEBoK (Stakeholder Needs Definition → System Requirements Definition).

## Result

`Requirement` (`FR-*`, `NFR-*`) with:

- `traces_to` that points to `BP-*` or `IDF-*`, or to a stakeholder need (`level: stakeholder-need`) that points to them;
- `elicitation.technique` (`interview`, `workshop`, `observation`, `document-analysis`, `process-analysis`, `prototyping`, `usage-scenario`, `survey`, `user-story-mapping`);
- `elicitation.sources` with the personas, stakeholders, processes or activities that you consulted;
- an optional `level`: `stakeholder-need` for the need in the business language, `system` for the requirement that changes the need into a system requirement.

## Procedure

1. Examine each IDEF0 activity that has `automation: system` and has no children. Each of these activities must have a minimum of one functional requirement.
2. For each BPMN task that a persona does, ask what the system must do for the persona. Record the answer as a stakeholder need or as a requirement.
3. Record the technique and the source at the time of the elicitation. Do not record them later.
4. Do not make a functional requirement from a `manual` or `external` activity. If such an activity gives a functional requirement, the boundary changed. Then go back to SP1.
5. Run `daia gate SP2`. Correct the blocking `ELI-*` findings.
6. Apply `specify-quality-scenarios` to the NFR.

If a requirement has no source that you can show, stop. If a requirement names a component or a technology, stop.
