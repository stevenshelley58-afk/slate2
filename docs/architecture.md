# Slate 2 Architecture Snapshot

## Monorepo layout
- `apps/web`: Vite + React placeholder for Express / Pro UI flows.
- `services/orchestrator`: Fastify service that drives the run lifecycle via the shared state machine and business rules.
- `services/{scraper,generator,andronoma-adapter,qa,exporter}`: Stubs ready for service-specific implementation.
- `packages/schemas`: TypeBox schemas for all contract-defined artifacts (personas, hooks, briefs, SSR config, QA, provenance, etc.) with a shared `schema_version`.
- `packages/business-rules`: Central banlists, thresholds, and gate evaluators (hook structure, distances, coverage caps, SSR metrics).
- `packages/state-machine`: Deterministic run lifecycle controller with autopilot pause gates at Segments, SSR, and QA.
- `packages/api-types`: Zod-powered OpenAPI surface types backed by the shared lifecycle constants.

## Orchestrator flow
1. `POST /runs` creates a run, seeds the state machine, and kicks off processing.
2. The lifecycle auto-advances through `queued -> scraping -> personas` and pauses at gated stages when autopilot is enabled.
3. Stage handlers (currently mocked) exercise business rules by validating sample hooks, briefs, and coverage against shared schemas.
4. `GET /runs/:id` and `/stages` reflect real-time status with schema-validated responses.
5. `POST /runs/:id/resume` unblocks gated stages (Segments, SSR, QA) to continue the pipeline.

## Next steps
1. Flesh out service handlers to call real scraper, generator, Andronoma adapter, QA, and exporter micro-services.
2. Implement persistence (Postgres or Dynamo) plus event sourcing for run context and artifacts instead of the in-memory store.
3. Wire OpenAI Responses + embeddings and Andronoma SSR clients according to pinned model and anchor policies.
4. Expand schema coverage for CSV/parquet artifacts (segment scores, ks_entropy, ssr_pmf) and add contract tests under `tests/contracts`.
5. Stand up CI with linting, type-check, Vitest, and schema validation gates aligned with `/docs/10-GITSPEC.md`.
6. Build the Express and Owner UIs to consume orchestrator APIs, surface gates, proofs, and SSR telemetry.
