import { Type } from "@sinclair/typebox";
import { z } from "zod";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

const ProofSchema = Type.Object({
  type: Type.String({ minLength: 1 }),
  source_ref: Type.String({ minLength: 1 }),
});

const MessageMapCore = Type.Object({
  segment_id: Type.String({ minLength: 1 }),
  problem: Type.String({ minLength: 1 }),
  objection: Type.String({ minLength: 1 }),
  outcome: Type.String({ minLength: 1 }),
  proof: ProofSchema,
  cta: Type.String({ minLength: 1 }),
  legal_risk: Type.Array(Type.String({ minLength: 1 }), { default: [] }),
});

export const MessageMapRecordSchema = withSchemaVersion(MessageMapCore);

export const MessageMapRecordZ = z.object({
  schema_version: z.literal("0.2.0"),
  segment_id: z.string().min(1),
  problem: z.string().min(1),
  objection: z.string().min(1),
  outcome: z.string().min(1),
  proof: z.object({
    type: z.string().min(1),
    source_ref: z.string().min(1),
  }),
  cta: z.string().min(1),
  legal_risk: z.array(z.string().min(1)).default([]),
});

export type MessageMapRecord = ArtifactStatic<typeof MessageMapRecordSchema>;
