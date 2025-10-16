import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const AssetsManifestRecordSchema = withSchemaVersion(
  Type.Object({
    asset_id: Type.String({ minLength: 1 }),
    segment_id: Type.String({ minLength: 1 }),
    archetype: Type.String({ minLength: 1 }),
    hook_id: Type.String({ minLength: 1 }),
    ratio: Type.Union([
      Type.Literal("9:16"),
      Type.Literal("1:1"),
      Type.Literal("4:5"),
      Type.Literal("16:9"),
    ]),
    variant: Type.String({ minLength: 1 }),
    filename: Type.String({ minLength: 1 }),
    checksum: Type.String({ minLength: 1 }),
    license_tag: Type.Union([
      Type.Literal("generated"),
      Type.Literal("user-owned"),
      Type.Literal("licensed"),
    ]),
  }),
);

export type AssetsManifestRecord = ArtifactStatic<
  typeof AssetsManifestRecordSchema
>;
