import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const HookRecordSchema = withSchemaVersion(
  Type.Object({
    hook_id: Type.String({ minLength: 1 }),
    segment_id: Type.String({ minLength: 1 }),
    device: Type.Union([
      Type.Literal("mobile"),
      Type.Literal("desktop"),
      Type.Literal("story"),
      Type.Literal("square"),
    ]),
    hook_text: Type.String({ minLength: 1, maxLength: 120 }),
    proof_ref: Type.String({ minLength: 1 }),
    novelty: Type.Number({ minimum: 0, maximum: 1 }),
    min_distance: Type.Number({ minimum: 0, maximum: 1 }),
    legal_risk: Type.Array(Type.String({ minLength: 1 }), { default: [] }),
  }),
);

export type HookRecord = ArtifactStatic<typeof HookRecordSchema>;
