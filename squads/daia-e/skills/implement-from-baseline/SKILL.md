---
name: implement-from-baseline
description: Implement software from a signed architecture baseline. Move the test contracts from red to green. Use only after SP3.
---

# Implement from the baseline

The baseline and its contracts are the authority for the scope. A request in natural language does not replace a recorded decision.

## Result

Write code that has a trace to the specification. Keep the contracts. Change `TestContract.phase` to `green` only after a successful run.

## Procedure

Before you make artifacts, read `daia next --json`, `.daia/guide.md` and the local schemas in `.daia/schemas/`. Record the result with `daia verify` in the applicable step.

1. Run `daia status`. If SP3 is not signed, stop. If SP3 has drift that nobody decided, stop.
2. Read the views, the decisions, the specifications and the tests before you edit code.
3. Implement one contract at a time. Do not add functions that nobody asked for.
4. If a decision is not available, send the finding back to the architecture.
5. If the scenario is not correct, send the finding back to the requirements.
6. Declare the implementation files and the configuration files in `verification.<TC-id>.inputs`.
7. Run the technical gates. Then run `daia verify SP4`.
8. Write the quality report for each characteristic.

Do not change a test only to get a green result. Do not sign the baseline.
