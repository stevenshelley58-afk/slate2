import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const SsrConfigSchema = withSchemaVersion(
  Type.Object({
    anchor_sets_version: Type.String({ minLength: 1 }),
    embedding_model: Type.String({ const: "text-embedding-3-small" }),
    temperature: Type.Number({ const: 1 }),
    epsilon: Type.Number({ const: 0 }),
    sets: Type.Integer({ const: 6 }),
  }),
);

export type SsrConfig = ArtifactStatic<typeof SsrConfigSchema>;
