# Vertical Slice Smoke Test

This walkthrough exercises the contracts-first vertical slice from URL intake to
artifact export. Run the commands while the orchestrator is listening
(`pnpm --filter @slate/orchestrator dev`).

1. **Kick a run**

   ```bash
   curl -s -X POST http://localhost:3333/runs \
     -H "content-type: application/json" \
     -d '{"url":"https://example.com/product","seed":42}' \
     | jq .
   ```

   Expected: JSON payload that matches the `RunSummary` schema with
   `current_stage: "done"` and `autopilot_enabled: false`.

2. **Inspect staged history**

   ```bash
   curl -s http://localhost:3333/runs/<RUN_ID>/stages | jq .
   ```

   Expected: each stage enumerated in order with ISO timestamps; no blocked
   stages because autopilot is disabled for the slice.

3. **Fetch personas artifact**

   ```bash
   curl -s "http://localhost:3333/runs/<RUN_ID>/artifacts?stage=personas" | jq -r '.artifacts[0].body'
   ```

   Expected: newline-delimited JSON where each object validates against
   `PersonaRecordSchema` (`schema_version` field present).

4. **Fetch hooks artifact**

   ```bash
   curl -s "http://localhost:3333/runs/<RUN_ID>/artifacts?stage=hooks" | jq -r '.artifacts[0].body'
   ```

   Expected: JSONL body where the first line of `hook_text` respects the style
   rule (≤9 words) and includes a numeric proof anchor.

5. **Fetch SSR config**

   ```bash
   curl -s "http://localhost:3333/runs/<RUN_ID>/artifacts?stage=ssr" | jq -r '.artifacts[0].body'
   ```

   Expected: JSON document validating against `SsrConfigSchema`; the
   `anchor_sets_version` mirrors the run summary and `embedding_model` is
   `text-embedding-3-small`.

6. **Fetch export manifest**

   ```bash
   curl -s "http://localhost:3333/runs/<RUN_ID>/artifacts?stage=pack" | jq -r '.artifacts[] | select(.artifact_type=="export_manifest").body'
   ```

   Expected: plain-text list of files that would be included in the archive,
   referencing the on-disk `/tmp/slate2/<RUN_ID>` paths.

7. **Inspect thresholds**

   ```bash
   curl -s "http://localhost:3333/segments?run_id=<RUN_ID>" | jq .
   ```

   Expected: `thresholds` object echoing constants from `@slate/business-rules`
   (style max words = 9, novelty copy floor = 0.18, distance hook = 0.82, etc.)
   and `segments` array with deterministic scores derived from the provided
   seed.
