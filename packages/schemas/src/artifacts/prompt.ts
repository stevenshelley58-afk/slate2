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
    prompt_seeds: Type.Array(Type.Integer({ minimum: 0 }), {
      minItems: 1,
      description: "Deterministic seeds used for prompt and sampling reproducibility.",
    }),
    model_params_hash: Type.String({
      minLength: 1,
      description: "Hash of model configuration parameters used for the invocation.",
    }),
    response_params_hash: Type.String({
      minLength: 1,
      description: "Hash of post-processing or decoding parameters applied to the response.",
    }),
  }),
);

export type PromptRecord = ArtifactStatic<typeof PromptRecordSchema>;
