import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

// Schema for filenames.csv documentation
export const FilenamesCsvDocSchema = withSchemaVersion(
  Type.Object({
    description: Type.String({ minLength: 1 }),
    format: Type.Literal("CSV"),
    encoding: Type.Literal("UTF-8"),
    delimiter: Type.Literal(","),
    headers: Type.Array(
      Type.Object({
        column: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
        type: Type.String({ minLength: 1 }),
        required: Type.Boolean(),
        example: Type.Optional(Type.String()),
      })
    ),
    filename_pattern: Type.String({ minLength: 1 }),
    naming_convention: Type.Object({
      asset_files: Type.String({ 
        description: "Pattern: {segment_id}-{archetype}-{variant}-{ratio}.{ext}",
        minLength: 1 
      }),
      manifest_files: Type.String({ 
        description: "Pattern: {run_id}-{type}-{timestamp}.{ext}",
        minLength: 1 
      }),
      max_length: Type.Integer({ minimum: 1, maximum: 255 }),
      allowed_characters: Type.String({ 
        description: "Regex pattern for allowed characters",
        minLength: 1 
      }),
    }),
    examples: Type.Array(
      Type.Object({
        filename: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
        category: Type.Union([
          Type.Literal("asset"),
          Type.Literal("manifest"),
          Type.Literal("qa_report"),
          Type.Literal("prompts"),
        ]),
      })
    ),
    validation_rules: Type.Array(
      Type.Object({
        rule: Type.String({ minLength: 1 }),
        description: Type.String({ minLength: 1 }),
        severity: Type.Union([
          Type.Literal("error"),
          Type.Literal("warning"),
        ]),
      })
    ),
    usage_notes: Type.Array(Type.String({ minLength: 1 })),
  }),
);

export type FilenamesCsvDoc = ArtifactStatic<typeof FilenamesCsvDocSchema>;

// Schema for the actual filenames.csv data structure
export const FilenamesCsvRecordSchema = withSchemaVersion(
  Type.Object({
    filename: Type.String({ minLength: 1 }),
    category: Type.Union([
      Type.Literal("asset"),
      Type.Literal("manifest"),
      Type.Literal("qa_report"),
      Type.Literal("prompts"),
      Type.Literal("archive"),
    ]),
    file_type: Type.String({ minLength: 1 }),
    segment_id: Type.Optional(Type.String({ minLength: 1 })),
    run_id: Type.Optional(Type.String({ minLength: 1 })),
    size_bytes: Type.Integer({ minimum: 0 }),
    checksum: Type.String({ minLength: 1 }),
    created_at: Type.String({ format: "date-time" }),
    relative_path: Type.String({ minLength: 1 }),
    export_batch: Type.String({ minLength: 1 }),
  }),
);

export const FilenamesCsvSchema = Type.Array(FilenamesCsvRecordSchema);

export type FilenamesCsvRecord = ArtifactStatic<typeof FilenamesCsvRecordSchema>;
<<<<<<< HEAD
export type FilenamesCsv = FilenamesCsvRecord[];
=======
export type FilenamesCsv = FilenamesCsvRecord[];
>>>>>>> m5d-exporter
