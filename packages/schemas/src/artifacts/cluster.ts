import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

const CentroidVectorSchema = Type.Array(Type.Number(), {
  minItems: 3,
  description:
    "Embedding centroid vector; dimensionality aligns with text-embedding-3-small.",
});

export const ClusterRecordSchema = withSchemaVersion(
  Type.Object({
    cluster_id: Type.String({ minLength: 1 }),
    centroid: CentroidVectorSchema,
    member_persona_ids: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
    }),
    avg_cosine: Type.Number({ minimum: 0, maximum: 1 }),
    size: Type.Integer({ minimum: 1 }),
    silhouette: Type.Number({
      minimum: -1,
      maximum: 1,
      description: "Silhouette score indicating cluster cohesion and separation.",
    }),
    min_spacing: Type.Number({
      minimum: 0,
      description: "Minimum centroid spacing observed between this and neighboring clusters.",
    }),
  }),
);

export type ClusterRecord = ArtifactStatic<typeof ClusterRecordSchema>;
