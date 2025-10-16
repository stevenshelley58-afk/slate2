import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

const SegmentScoreCore = Type.Object({
  segment_id: Type.String({ minLength: 1 }),
  intent: Type.Number({ minimum: 0, maximum: 1 }),
  margin: Type.Number({ minimum: 0, maximum: 1 }),
  proof: Type.Number({ minimum: 0, maximum: 1 }),
  novelty: Type.Number({ minimum: 0, maximum: 1 }),
  evidence_weight: Type.Number({ minimum: 0, maximum: 1 }),
  claim_risk: Type.Number({ minimum: 0, maximum: 1 }),
  total: Type.Number({ minimum: 0, maximum: 1 }),
});

export const SegmentScoreRecordSchema = withSchemaVersion(SegmentScoreCore);

export type SegmentScoreRecord = ArtifactStatic<typeof SegmentScoreRecordSchema>;
