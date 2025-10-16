# Slate 2

![CI](https://github.com/your-org/slate2/actions/workflows/ci.yaml/badge.svg)

Creative generation platform scaffolding aligned with the provided specs.

## Quick start
- Install dependencies: pnpm install
- Run orchestrator dev server: pnpm --filter @slate/orchestrator dev
- Launch web placeholder: pnpm --filter @slate/web dev

## How to run
1. `pnpm install`
2. `pnpm -r build`
3. `pnpm -r --if-present test`
4. `bash tests/determinism/check.sh`
5. `node scripts/smoke.mjs`

### References
- Architecture snapshot: docs/architecture.md
- Specs: docs/00-MASTER_SPEC.md (see provided docs tree)
