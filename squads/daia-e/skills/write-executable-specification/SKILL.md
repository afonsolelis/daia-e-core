---
name: write-executable-specification
description: Change architecture decisions into technical contracts and executable tests that are red at the start. Use before you implement functions or integrations.
---

# Write the executable specification

The specification comes before the test. The test comes before the implementation. If a gap needs a decision, send it back to the architecture.

## Result

Write the contracts for interfaces, data, rules and integrations. Refer to them in `models[].path`. Make a `TestContract` in `.daia/model/tests/` and the test in `test_path`. The initial phase is `red`, and `verifies` points to the requirement or to the scenario.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` in the applicable step.

1. Read the views, the decisions and the scenarios. Keep a trace for each relevant statement.
2. Specify the formats, invariants, errors and limits. Do not invent behavior.
3. Write the tests against the specification.
4. Make sure that the tests fail because the implementation is not available.
5. Configure `verification` for each contract in `.daia/config.json`.
6. Run `daia verify SP3`. Record `phase` from the result.
7. Examine the failure. An infrastructure error does not show that the behavior is absent.
8. In a project that exists before DAIA-E, keep the contracts that are already green.

Do not implement the product. Do not make the contracts weaker to accept the code that exists.
