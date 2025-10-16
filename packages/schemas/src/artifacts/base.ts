import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { schemaVersionLiteral } from "../schema-version.js";

/**
 * Utility to wrap artifact payloads with the required schema metadata.
 */
export function withSchemaVersion<T extends TSchema>(schema: T) {
  return Type.Intersect([
    Type.Object({
      schema_version: Type.Literal(schemaVersionLiteral),
    }),
    schema,
  ]);
}

export type ArtifactStatic<T extends ReturnType<typeof withSchemaVersion>> =
  Static<T>;
