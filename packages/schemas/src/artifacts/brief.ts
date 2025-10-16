import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

const PlacementSchema = Type.Object({
  ratio: Type.Union([
    Type.Literal("9:16"),
    Type.Literal("1:1"),
    Type.Literal("4:5"),
  ]),
  frames: Type.Array(Type.String({ minLength: 1 }), {
    description: "Per-frame on-screen text for mute-safe playback.",
  }),
});

export const BriefRecordSchema = withSchemaVersion(
  Type.Object({
    asset_id: Type.String({ minLength: 1 }),
    segment_id: Type.String({ minLength: 1 }),
    archetype: Type.Union([
      Type.Literal("problem-solution"),
      Type.Literal("ugc"),
      Type.Literal("demo"),
      Type.Literal("offer"),
      Type.Literal("founder"),
    ]),
    single_claim: Type.String({ minLength: 1 }),
    proof_ref: Type.String({ minLength: 1 }),
    cta: Type.String({ minLength: 1 }),
    placements: Type.Array(PlacementSchema, { minItems: 3 }),
    on_screen_text: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: "Ordered overlay text ensuring =12 words per screen.",
    }),
    voiceover_short: Type.String({ minLength: 1 }),
    policy_flags: Type.Array(Type.String({ minLength: 1 }), { default: [] }),
    accessibility_notes: Type.String({ minLength: 1 }),
  }),
);

export type BriefRecord = ArtifactStatic<typeof BriefRecordSchema>;
