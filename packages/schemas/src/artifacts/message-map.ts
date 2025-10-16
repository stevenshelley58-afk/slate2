import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

const ProofSchema = Type.Object({
  type: Type.String({ minLength: 1 }),
  source_ref: Type.String({ minLength: 1 }),
});

export const MessageMapRecordSchema = withSchemaVersion(
  Type.Object({
    segment_id: Type.String({ minLength: 1 }),
    problem: Type.String({ minLength: 1 }),
    objection: Type.String({ minLength: 1 }),
    outcome: Type.String({ minLength: 1 }),
    proof: ProofSchema,
    cta: Type.String({ minLength: 1 }),
    legal_risk: Type.Array(Type.String({ minLength: 1 }), { default: [] }),
  }),
);

export type MessageMapRecord = ArtifactStatic<typeof MessageMapRecordSchema>;
