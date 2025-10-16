import { createRng, deriveSeed } from "./random.js";
import type { HookGeneration } from "./types.js";

export interface ImagePromptVariant {
  variant_id: string;
  hook_id: string;
  prompt: string;
  variant_type: "macro" | "human-in-use" | "wide-context";
  negative_space: number; // 25-40%
  lighting: "daylight" | "soft-window" | "tungsten";
  style_tokens: string[];
}

export interface ImagePromptGeneration {
  hook_id: string;
  variants: ImagePromptVariant[];
}

const VARIANT_TYPES: ImagePromptVariant["variant_type"][] = [
  "macro",
  "human-in-use", 
  "wide-context",
];

const LIGHTING_OPTIONS: ImagePromptVariant["lighting"][] = [
  "daylight",
  "soft-window",
  "tungsten",
];

const STYLE_TOKEN_POOLS = {
  macro: [
    "close-up", "detailed", "sharp focus", "high resolution", "macro lens",
    "textured", "intricate", "fine details", "crystal clear", "professional"
  ],
  "human-in-use": [
    "authentic", "natural pose", "genuine smile", "comfortable", "relaxed",
    "focused", "engaged", "confident", "casual", "realistic"
  ],
  "wide-context": [
    "environmental", "contextual", "atmospheric", "immersive", "spacious",
    "panoramic", "storytelling", "lifestyle", "surrounding", "comprehensive"
  ]
};

const LIGHTING_TOKENS = {
  daylight: ["natural light", "sunlit", "bright", "clear", "outdoor lighting"],
  "soft-window": ["soft lighting", "window light", "gentle", "diffused", "ambient"],
  tungsten: ["warm lighting", "cozy", "indoor", "soft glow", "intimate"]
};

export function generateImagePrompts(
  hooks: HookGeneration[],
  seed: number,
): ImagePromptGeneration[] {
  const baseSeed = deriveSeed(seed, "image-prompts");
  const results: ImagePromptGeneration[] = [];

  for (const hook of hooks) {
    const hookSeed = deriveSeed(baseSeed, hook.hook_id);
    
    const variants: ImagePromptVariant[] = [];
    
    for (let i = 0; i < 3; i++) {
      const variantType = VARIANT_TYPES[i];
      const variantSeed = deriveSeed(hookSeed, `variant-${i}`);
      const variantRng = createRng(variantSeed);
      
      const variant = generateImagePromptVariant({
        hook,
        variantType,
        variantIndex: i,
        rng: variantRng,
      });
      
      variants.push(variant);
    }
    
    results.push({
      hook_id: hook.hook_id,
      variants,
    });
  }
  
  return results;
}

function generateImagePromptVariant(params: {
  hook: HookGeneration;
  variantType: ImagePromptVariant["variant_type"];
  variantIndex: number;
  rng: ReturnType<typeof createRng>;
}): ImagePromptVariant {
  const { hook, variantType, variantIndex, rng } = params;
  
  // Generate negative space (25-40%)
  const negativeSpace = 25 + rng() * 15; // 25-40%
  
  // Select lighting
  const lighting = LIGHTING_OPTIONS[Math.floor(rng() * LIGHTING_OPTIONS.length)];
  
  // Generate style tokens ensuring ≥6 token difference and ≤3 shared tokens
  const styleTokens = generateStyleTokens({
    variantType,
    lighting,
    hookText: hook.hook_text,
    device: hook.device,
    rng,
  });
  
  // Build the prompt
  const prompt = buildImagePrompt({
    hook,
    variantType,
    negativeSpace,
    lighting,
    styleTokens,
  });
  
  return {
    variant_id: `${hook.hook_id}-variant-${variantIndex + 1}`,
    hook_id: hook.hook_id,
    prompt,
    variant_type: variantType,
    negative_space: Math.round(negativeSpace),
    lighting,
    style_tokens: styleTokens,
  };
}

function generateStyleTokens(params: {
  variantType: ImagePromptVariant["variant_type"];
  lighting: ImagePromptVariant["lighting"];
  hookText: string;
  device: HookGeneration["device"];
  rng: ReturnType<typeof createRng>;
}): string[] {
  const { variantType, lighting, device, rng } = params;
  
  // Base tokens for variant type
  const baseTokens = [...STYLE_TOKEN_POOLS[variantType]];
  
  // Add lighting tokens
  const lightingTokens = [...LIGHTING_TOKENS[lighting]];
  
  // Add device-specific tokens
  const deviceTokens = getDeviceTokens(device);
  
  // Combine and select tokens ensuring variety
  const allTokens = [...baseTokens, ...lightingTokens, ...deviceTokens];
  
  // Select 8-12 tokens to ensure ≥6 token difference between variants
  const tokenCount = 8 + Math.floor(rng() * 5); // 8-12 tokens
  const selectedTokens = shuffleArray(rng, allTokens).slice(0, tokenCount);
  
  return selectedTokens;
}

function getDeviceTokens(device: HookGeneration["device"]): string[] {
  const deviceTokenMap = {
    mobile: ["mobile-optimized", "vertical", "portrait", "thumb-friendly", "touch-focused"],
    desktop: ["wide-screen", "horizontal", "desktop-view", "detailed", "full-featured"],
    story: ["story-format", "vertical", "immersive", "swipe-friendly", "narrative"],
    square: ["square-format", "balanced", "social-media", "centered", "compact"],
  };
  
  return deviceTokenMap[device] || [];
}

function buildImagePrompt(params: {
  hook: HookGeneration;
  variantType: ImagePromptVariant["variant_type"];
  negativeSpace: number;
  lighting: ImagePromptVariant["lighting"];
  styleTokens: string[];
}): string {
  const { hook, variantType, negativeSpace, lighting, styleTokens } = params;
  
  // Extract key concepts from hook text
  const hookConcepts = extractConceptsFromHook(hook.hook_text);
  
  // Build variant-specific prompt structure
  let prompt = "";
  
  switch (variantType) {
    case "macro":
      prompt = `Close-up macro photography of ${hookConcepts.join(", ")}`;
      break;
    case "human-in-use":
      prompt = `Person using or interacting with ${hookConcepts.join(", ")} in natural setting`;
      break;
    case "wide-context":
      prompt = `Wide environmental shot showing ${hookConcepts.join(", ")} in context`;
      break;
  }
  
  // Add lighting description
  prompt += `, ${lighting} lighting`;
  
  // Add style tokens
  prompt += `, ${styleTokens.join(", ")}`;
  
  // Add negative space specification
  prompt += `, ${negativeSpace}% negative space`;
  
  // Add technical specifications
  prompt += ", professional photography, high quality, sharp focus";
  
  return prompt;
}

function extractConceptsFromHook(hookText: string): string[] {
  // Simple concept extraction - in a real implementation this would be more sophisticated
  const words = hookText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !isStopWord(word));
  
  // Remove duplicates and return top concepts
  const uniqueWords = [...new Set(words)];
  return uniqueWords.slice(0, 3); // Take top 3 concepts
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
    'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its',
    'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'oil',
    'sit', 'use', 'way', 'will', 'with', 'this', 'that', 'they', 'have', 'from',
    'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there',
    'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'should',
    'because', 'through', 'before', 'right', 'being', 'means', 'during', 'under',
    'while', 'might', 'place', 'such', 'against', 'between', 'every', 'little',
    'since', 'until', 'within', 'without', 'about', 'above', 'across', 'after',
    'again', 'below', 'beside', 'beyond', 'inside', 'outside', 'upon'
  ]);
  
  return stopWords.has(word);
}

function shuffleArray<T>(rng: ReturnType<typeof createRng>, array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
