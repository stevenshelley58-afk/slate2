import { schemaVersionLiteral, PersonaRecordSchema } from "@slate/schemas";

import { createRng, randomInt, shuffleInPlace } from "./random.js";
import type {
  PersonaRecord,
  ScrapeAttributes,
  PersonaGenerationOptions,
  PersonaBlueprint,
} from "./types.js";

const DEFAULT_PERSONA_MIN = 12;
const DEFAULT_PERSONA_MAX = 20;
const DEFAULT_WEIGHT = 1;
const MIN_CONFIDENCE = 0.2;
const MAX_CONFIDENCE = 0.9;

type PersonaDraft = PersonaBlueprint & {
  persona_id: string;
  confidence_level: number;
  evidence_refs: string[];
  weight: number;
};

export function generatePersonas(
  scrape: ScrapeAttributes,
  seed: number,
  options: PersonaGenerationOptions = {},
): PersonaRecord[] {
  const rng = createRng(seed);
  const minCount = clamp(
    options.minCount ?? DEFAULT_PERSONA_MIN,
    DEFAULT_PERSONA_MIN,
    DEFAULT_PERSONA_MAX,
  );
  const maxCount = clamp(
    options.maxCount ?? DEFAULT_PERSONA_MAX,
    minCount,
    DEFAULT_PERSONA_MAX,
  );

  const drafts = buildPersonaDrafts(scrape, rng);
  const count = clamp(randomInt(rng, minCount, maxCount), minCount, maxCount);
  const selected = drafts.slice(0, count);

  const personas: PersonaRecord[] = selected.map((draft, index) => {
    const persona: PersonaRecord = {
      schema_version: schemaVersionLiteral,
      persona_id: draft.persona_id,
      name: draft.name ?? deriveName(scrape.productName, draft.persona_id),
      jtbd:
        draft.jtbd ??
        deriveJtbd(
          scrape.primaryNeeds[0] ?? "discover value",
          draft.context ?? scrape.contexts?.[0],
        ),
      context: draft.context ?? pickValue(scrape.contexts, rng) ?? "Unknown",
      trigger: draft.trigger ?? pickValue(scrape.triggers, rng) ?? "Unclear",
      blocker: draft.blocker ?? pickValue(scrape.blockers, rng) ?? "None noted",
      price_sensitivity:
        draft.price_sensitivity ??
        inferPriceSensitivity(scrape.priceSignals, rng),
      confidence_level: clamp(draft.confidence_level, MIN_CONFIDENCE, MAX_CONFIDENCE),
      evidence_refs: Array.from(
        new Set(selectEvidenceRefs(scrape.evidence, rng, index, draft.evidence_refs)),
      ),
      weight: Math.max(draft.weight, 0),
    };

    if (!PersonaRecordSchema.Check(persona)) {
      throw new Error("Generated persona failed schema validation");
    }

    return persona;
  });

  return personas;
}

function buildPersonaDrafts(scrape: ScrapeAttributes, rng: ReturnType<typeof createRng>) {
  const { personaHints = [], evidence } = scrape;
  const drafts: PersonaDraft[] = [];

  const evidenceIds = evidence.map((item) => item.id);

  const baseBlueprints: PersonaBlueprint[] = personaHints.length
    ? personaHints
    : generateBlueprintsFromEvidence(scrape, rng);

  baseBlueprints.forEach((blueprint, index) => {
    drafts.push({
      ...blueprint,
      persona_id: `persona-${index + 1}`,
      confidence_level: blueprint.confidence_level ?? deriveConfidence(rng),
      evidence_refs: blueprint.evidence_refs?.length
        ? blueprint.evidence_refs
        : evidenceIds.slice(0, randomInt(rng, 1, Math.max(1, evidenceIds.length))),
      weight: blueprint.weight ?? DEFAULT_WEIGHT,
    });
  });

  shuffleInPlace(rng, drafts);
  return drafts;
}

function generateBlueprintsFromEvidence(
  scrape: ScrapeAttributes,
  rng: ReturnType<typeof createRng>,
): PersonaBlueprint[] {
  const needs = scrape.primaryNeeds.length > 0 ? scrape.primaryNeeds : ["General"];

  const templates = needs.map((need, index) => ({
    name: `${scrape.productName} ${need} Seeker`,
    jtbd: deriveJtbd(need, pickValue(scrape.contexts, rng)),
    context: pickValue(scrape.contexts, rng) ?? "General",
    trigger: pickValue(scrape.triggers, rng) ?? "Unspecified",
    blocker: pickValue(scrape.blockers, rng) ?? "Unknown",
    price_sensitivity: inferPriceSensitivity(scrape.priceSignals, rng),
    confidence_level: deriveConfidence(rng),
    evidence_refs: selectEvidenceRefs(scrape.evidence, rng, index, undefined),
    weight: DEFAULT_WEIGHT,
  }));

  return templates.length > 0
    ? templates
    : [createFallbackBlueprint(scrape, rng)];
}

function createFallbackBlueprint(
  scrape: ScrapeAttributes,
  rng: ReturnType<typeof createRng>,
): PersonaBlueprint {
  return {
    name: `${scrape.productName} Persona`,
    jtbd: "Understand the product value proposition",
    context: pickValue(scrape.contexts, rng) ?? "General",
    trigger: pickValue(scrape.triggers, rng) ?? "Unspecified",
    blocker: pickValue(scrape.blockers, rng) ?? "Unknown",
    price_sensitivity: inferPriceSensitivity(scrape.priceSignals, rng),
    confidence_level: deriveConfidence(rng),
    evidence_refs: selectEvidenceRefs(scrape.evidence, rng, 0, undefined),
    weight: DEFAULT_WEIGHT,
  };
}

function selectEvidenceRefs(
  evidence: ScrapeAttributes["evidence"],
  rng: ReturnType<typeof createRng>,
  index: number,
  existingRefs: string[] | undefined,
): string[] {
  if (existingRefs?.length) {
    return existingRefs;
  }

  if (evidence.length === 0) {
    return [];
  }

  const max = Math.min(3, evidence.length);
  const count = clamp(randomInt(rng, 1, max), 1, max);
  const shuffled = shuffleInPlace(rng, [...evidence]);
  return shuffled.slice(0, count).map((entry, offset) => entry.id ?? `evidence-${index}-${offset}`);
}

function deriveConfidence(rng: ReturnType<typeof createRng>) {
  return clamp(rng(), MIN_CONFIDENCE, MAX_CONFIDENCE);
}

function deriveName(productName: string, personaId: string) {
  const suffix = personaId.split("-")[1] ?? personaId;
  return `${productName} Persona ${suffix}`;
}

function deriveJtbd(need: string, context?: string | undefined) {
  const core = need || "discover value";
  return context ? `Achieve ${core} in ${context}` : `Achieve ${core}`;
}

function pickValue<T>(values: T[] | undefined, rng: ReturnType<typeof createRng>) {
  if (!values?.length) {
    return undefined;
  }

  const index = randomInt(rng, 0, values.length - 1);
  return values[index];
}

function inferPriceSensitivity(
  signals: ScrapeAttributes["priceSignals"],
  rng: ReturnType<typeof createRng>,
) {
  if (!signals?.length) {
    return "medium";
  }

  const total = signals.reduce((sum, signal) => sum + Math.max(0, signal.weight ?? 1), 0);
  if (total <= 0) {
    return "medium";
  }

  let cursor = rng() * total;
  for (const signal of signals) {
    cursor -= Math.max(0, signal.weight ?? 1);
    if (cursor <= 0) {
      return signal.tier;
    }
  }

  return signals.at(-1)?.tier ?? "medium";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}