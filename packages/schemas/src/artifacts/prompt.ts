import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const PromptRecordSchema = withSchemaVersion(
  Type.Object({
    prompt_id: Type.String({ minLength: 1 }),
    stage: Type.String({ minLength: 1 }),
    model: Type.String({ minLength: 1 }),
    model_revision: Type.String({ minLength: 1 }),
    input_tokens: Type.Integer({ minimum: 0 }),
    output_tokens: Type.Integer({ minimum: 0 }),
    prompt_text: Type.String({ minLength: 1 }),
    response_ref: Type.String({ minLength: 1 }),
    created_at: Type.String({ format: "date-time" }),
  }),
);

export type PromptRecord = ArtifactStatic<typeof PromptRecordSchema>;
