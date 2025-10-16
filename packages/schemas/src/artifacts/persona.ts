import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const PersonaRecordSchema = withSchemaVersion(
  Type.Object({
    persona_id: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    jtbd: Type.String({ minLength: 1 }),
    context: Type.String({ minLength: 1 }),
    trigger: Type.String({ minLength: 1 }),
    blocker: Type.String({ minLength: 1 }),
    price_sensitivity: Type.Union([
      Type.Literal("low"),
      Type.Literal("medium"),
      Type.Literal("high"),
    ]),
    confidence_level: Type.Number({
      minimum: 0,
      maximum: 1,
      description: "Normalized confidence weight derived from evidence quality.",
    }),
    evidence_refs: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: "Source identifiers referencing scrape_raw.json or media index.",
    }),
    weight: Type.Number({
      minimum: 0,
      description: "Relative importance weight used for segment scoring.",
    }),
  }),
);

export type PersonaRecord = ArtifactStatic<typeof PersonaRecordSchema>;
