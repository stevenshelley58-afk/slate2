import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

const QaCheckSchema = Type.Object({
  check_id: Type.String({ minLength: 1 }),
  category: Type.String({ minLength: 1 }),
  status: Type.Union([
    Type.Literal("pass"),
    Type.Literal("fail"),
    Type.Literal("warn"),
  ]),
  severity: Type.Union([
    Type.Literal("low"),
    Type.Literal("medium"),
    Type.Literal("high"),
  ]),
  message: Type.String({ minLength: 1 }),
  remediation: Type.Optional(Type.String()),
  evidence_refs: Type.Array(Type.String({ minLength: 1 }), { default: [] }),
});

export const QaReportSchema = withSchemaVersion(
  Type.Object({
    run_id: Type.String({ minLength: 1 }),
    generated_at: Type.String({ format: "date-time" }),
    summary: Type.Object({
      status: Type.Union([
        Type.Literal("pass"),
        Type.Literal("fail"),
        Type.Literal("blocked"),
      ]),
      coverage: Type.Number({ minimum: 0, maximum: 1 }),
      notes: Type.String(),
    }),
    checks: Type.Array(QaCheckSchema),
  }),
);

export type QaReport = ArtifactStatic<typeof QaReportSchema>;
