import { describe, it, expect, beforeEach } from "vitest";
import { RunStateMachine } from "@slate/state-machine";
import { registerPipeline } from "../pipeline.js";
import type { PipelineRuntime } from "../pipeline-types.js";

function createRuntime(seed = 42) {
  const machine = new RunStateMachine();
  const context = machine.initializeContext({
    runId: `test-run-${seed}`,
    tenantId: "tenant",
    sourceUrl: "https://example.com",
    anchorSetVersion: "v1",
    modelRevision: "rev",
    locale: "en-US",
    currency: "USD",
    autopilotEnabled: true,
  });

  const runtime: PipelineRuntime = {
    context,
    seed,
    artifacts: [],
    segments: [],
    maps: [],
    hooks: [],
    prompts: [],
    imagePrompts: [],
    storyboards: [],
  };

  registerPipeline(machine, runtime);
  return { machine, context, runtime };
}

async function advanceToQa(machine: RunStateMachine, runtime: PipelineRuntime) {
  const { context } = runtime;
  await machine.start(context);
  await machine.resumeFromBlocked(context, "segments");
  await machine.resumeFromBlocked(context, "ssr");
}

describe("exporter gating", () => {
  let machine: RunStateMachine;
  let runtime: PipelineRuntime;

  beforeEach(() => {
    ({ machine, runtime } = createRuntime());
  });

  it("fails when coverage drops below target", async () => {
    await advanceToQa(machine, runtime);

    runtime.imagePrompts = runtime.imagePrompts.filter(
      (prompt) => prompt.aspect_ratio === "9:16",
    );

    await expect(machine.resumeFromBlocked(runtime.context, "qa")).rejects.toThrow(/Coverage/);
  });

  it("fails when caps are exceeded", async () => {
    await advanceToQa(machine, runtime);

    const duplicate = { ...runtime.imagePrompts[0] };
    duplicate.prompt_id = `${duplicate.prompt_id}-extra`;
    duplicate.variant = "C";
    runtime.imagePrompts.push(duplicate);

    await expect(machine.resumeFromBlocked(runtime.context, "qa")).rejects.toThrow(/Caps violation/);
  });

  it("fails when accessibility checks fail", async () => {
    await advanceToQa(machine, runtime);

    runtime.storyboards[0]?.frames.forEach((frame) => {
      frame.accessibility.safe_area = false;
    });

    await expect(machine.resumeFromBlocked(runtime.context, "qa")).rejects.toThrow(
      /Accessibility checks failed/,
    );
  });
});
