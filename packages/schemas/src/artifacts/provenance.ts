import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const ProvenanceRecordSchema = withSchemaVersion(
  Type.Object({
    run_id: Type.String({ minLength: 1 }),
    artifact_id: Type.String({ minLength: 1 }),
    stage: Type.String({ minLength: 1 }),
    service: Type.String({ minLength: 1 }),
    model_revision: Type.Optional(Type.String()),
    anchor_set_version: Type.Optional(Type.String()),
    source_artifacts: Type.Array(Type.String({ minLength: 1 }), {
      default: [],
    }),
    created_at: Type.String({ format: "date-time" }),
  }),
);

export type ProvenanceRecord = ArtifactStatic<typeof ProvenanceRecordSchema>;
