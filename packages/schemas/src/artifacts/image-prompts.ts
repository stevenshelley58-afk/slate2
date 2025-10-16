import { Type } from "@sinclair/typebox";
import { withSchemaVersion, type ArtifactStatic } from "./base.js";

export const ImagePromptRecordSchema = withSchemaVersion(
  Type.Object({
    prompt_id: Type.String({ minLength: 1 }),
    segment_id: Type.String({ minLength: 1 }),
    archetype: Type.String({ minLength: 1 }),
    hook_id: Type.String({ minLength: 1 }),
    variant: Type.String({ minLength: 1 }),
    aspect_ratio: Type.Union([
      Type.Literal("9:16"),
      Type.Literal("1:1"),
      Type.Literal("4:5"),
      Type.Literal("16:9"),
    ]),
    prompt_text: Type.String({ minLength: 1, maxLength: 2000 }),
    style_category: Type.Union([
      Type.Literal("photorealistic"),
      Type.Literal("illustration"),
      Type.Literal("minimalist"),
      Type.Literal("bold"),
      Type.Literal("vintage"),
      Type.Literal("modern"),
      Type.Literal("hand-drawn"),
      Type.Literal("geometric"),
    ]),
    color_scheme: Type.Union([
      Type.Literal("monochrome"),
      Type.Literal("complementary"),
      Type.Literal("analogous"),
      Type.Literal("triadic"),
      Type.Literal("warm"),
      Type.Literal("cool"),
      Type.Literal("neutral"),
    ]),
    composition_type: Type.Union([
      Type.Literal("centered"),
      Type.Literal("rule-of-thirds"),
      Type.Literal("diagonal"),
      Type.Literal("symmetrical"),
      Type.Literal("asymmetrical"),
      Type.Literal("layered"),
      Type.Literal("minimal"),
    ]),
    visual_elements: Type.Array(
      Type.Union([
        Type.Literal("product"),
        Type.Literal("lifestyle"),
        Type.Literal("text-overlay"),
        Type.Literal("background"),
        Type.Literal("foreground"),
        Type.Literal("icon"),
        Type.Literal("illustration"),
        Type.Literal("photograph"),
      ]),
      { minItems: 1, maxItems: 8 }
    ),
    model: Type.String({ minLength: 1 }),
    model_revision: Type.String({ minLength: 1 }),
    input_tokens: Type.Integer({ minimum: 0 }),
    output_tokens: Type.Integer({ minimum: 0 }),
    generated_image_ref: Type.Optional(Type.String({ minLength: 1 })),
    created_at: Type.String({ format: "date-time" }),
    metadata: Type.Optional(
      Type.Object({
        seed: Type.Optional(Type.Number()),
        guidance_scale: Type.Optional(Type.Number()),
        steps: Type.Optional(Type.Integer()),
        sampler: Type.Optional(Type.String()),
      })
    ),
  }),
);

export const ImagePromptsSchema = Type.Array(ImagePromptRecordSchema);

export type ImagePromptRecord = ArtifactStatic<typeof ImagePromptRecordSchema>;
export type ImagePrompts = ImagePromptRecord[];