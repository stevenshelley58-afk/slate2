import { RunStateMachine } from "@slate/state-machine";
import {
  schemaVersionLiteral,
  type HookRecord,
  type BriefRecord,
} from "@slate/schemas";
import {
  enforceCoverage,
  enforceHookStructure,
  enforceDistance,
  enforceBrief,
} from "@slate/business-rules";
import { logger } from "./logger.js";

const STAGE_DELAY_MS = Number(process.env.STAGE_DELAY_MS ?? 25);

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerDefaultHandlers(machine: RunStateMachine) {
  machine.registerHandler("scraping", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Scraping stage stub");
    await sleep(STAGE_DELAY_MS);
  });

  machine.registerHandler("personas", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Personas stage stub");
    await sleep(STAGE_DELAY_MS);
  });

  machine.registerHandler("segments", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Segments stage stub");
    await sleep(STAGE_DELAY_MS);
  });

  machine.registerHandler("maps", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Message maps stage stub");
    await sleep(STAGE_DELAY_MS);
  });

  machine.registerHandler("hooks", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Hooks stage stub");
    await sleep(STAGE_DELAY_MS);
    const sampleHook: HookRecord = {
      schema_version: schemaVersionLiteral,
      hook_id: `${ctx.runId}-hook-1`,
      segment_id: `${ctx.runId}-segment-1`,
      device: "mobile",
      hook_text: "Cut 32% off refill costs in 2 clicks\nProof: pricing#bundle",
      proof_ref: "pricing#bundle",
      novelty: 0.32,
      min_distance: 0.41,
      legal_risk: [],
    };

    const structureGate = enforceHookStructure(sampleHook);
    if (!structureGate.ok) {
      throw new Error(structureGate.reason);
    }

    const distanceGate = enforceDistance(
      sampleHook.novelty,
      sampleHook.min_distance,
    );
    if (!distanceGate.ok) {
      throw new Error(distanceGate.reason);
    }
  });

  machine.registerHandler("briefs", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Briefs stage stub");
    await sleep(STAGE_DELAY_MS);

    const sampleBrief: BriefRecord = {
      schema_version: schemaVersionLiteral,
      asset_id: `${ctx.runId}-asset-1`,
      segment_id: `${ctx.runId}-segment-1`,
      archetype: "problem-solution",
      single_claim: "Refills ship in 2 days with tracked updates.",
      proof_ref: "shipping#policy",
      cta: "Plan your refill schedule",
      placements: [
        {
          ratio: "9:16",
          frames: [
            "Stock stays topped at 32% longer",
            "Tracked shipping hits in 2 days",
          ],
        },
        {
          ratio: "1:1",
          frames: [
            "See inventory count live",
            "Pause or swap anytime",
          ],
        },
        {
          ratio: "4:5",
          frames: [
            "Share portal access",
            "Restock with one click",
          ],
        },
      ],
      on_screen_text: [
        "Refill planner in 60 seconds",
        "Free swaps guaranteed",
      ],
      voiceover_short:
        "Walk viewers through the refill portal, highlight shipping tracking, and close with the two-day guarantee.",
      policy_flags: [],
      accessibility_notes: "Overlay text meets WCAG AA contrast with safe margins.",
    };

    const briefGate = enforceBrief(sampleBrief);
    if (!briefGate.ok) {
      throw new Error(briefGate.reason);
    }
  });

  machine.registerHandler("ssr", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "SSR stage stub");
    await sleep(STAGE_DELAY_MS);
  });

  machine.registerHandler("creative", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Creative stage stub");
    await sleep(STAGE_DELAY_MS);
  });

  machine.registerHandler("qa", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "QA stage stub");
    await sleep(STAGE_DELAY_MS);
    const coverageGate = enforceCoverage(0.81);
    if (!coverageGate.ok) {
      throw new Error(coverageGate.reason);
    }
  });

  machine.registerHandler("pack", async (ctx) => {
    logger.debug({ runId: ctx.runId }, "Pack stage stub");
    await sleep(STAGE_DELAY_MS);
  });
}
