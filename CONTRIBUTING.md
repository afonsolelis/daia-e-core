# Contribute to DAIA-E

You must have Node.js >= 18. There are no external dependencies.

Before you propose changes, run `npm run check`, `npm test` and
`npm run pack:check`. The tests use `node:test`. The workflow test covers the
onboarding, the five baselines, the run of the contracts and the detection of
changes.

Edit the skills and the roles in `squads/daia-e/`. Do not edit the installed
projections. If you add a capability, update `squad.json`. Keep the schemas and
the guide consistent with the gates. Each new rule must have tests with valid
cases and invalid cases. The tests must include the effect on existing projects.

Write all new text in English. New text follows the DAIA-E writing standard in
[`docs/ste/README.md`](docs/ste/README.md) and uses the technical names in
[`docs/ste/technical-names.json`](docs/ste/technical-names.json).

Use conventional commits. Describe the reason for the change, the resulting behavior and the
verification that you did. A change to the hash algorithm or to the contracts
must have a migration note in the README. Do not publish packages and do not
push changes to a remote without the authorization of the maintainer.
