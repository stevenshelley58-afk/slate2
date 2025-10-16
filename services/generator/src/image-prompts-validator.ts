import type { ImagePromptVariant, ImagePromptGeneration } from "./image-prompts.js";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VarianceMetrics {
  tokenDifferences: Record<string, number>;
  sharedTokens: Record<string, number>;
  negativeSpaceRanges: Record<string, { min: number; max: number }>;
  lightingVariety: Record<string, string[]>;
}

export function validateImagePromptVariants(
  generations: ImagePromptGeneration[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const generation of generations) {
    const variantValidation = validateHookVariants(generation);
    errors.push(...variantValidation.errors);
    warnings.push(...variantValidation.warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateHookVariants(generation: ImagePromptGeneration): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { variants } = generation;
  
  // Check we have exactly 3 variants
  if (variants.length !== 3) {
    errors.push(`Hook ${generation.hook_id}: Expected 3 variants, got ${variants.length}`);
    return { isValid: false, errors, warnings };
  }
  
  // Check variant types are unique
  const variantTypes = variants.map(v => v.variant_type);
  const uniqueTypes = new Set(variantTypes);
  if (uniqueTypes.size !== 3) {
    errors.push(`Hook ${generation.hook_id}: Duplicate variant types found`);
  }
  
  // Validate each variant individually
  for (const variant of variants) {
    const variantErrors = validateIndividualVariant(variant);
    errors.push(...variantErrors);
  }
  
  // Check variance rules between variants
  const varianceErrors = validateVarianceRules(variants);
  errors.push(...varianceErrors);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateIndividualVariant(variant: ImagePromptVariant): string[] {
  const errors: string[] = [];
  
  // Check negative space is in range (25-40%)
  if (variant.negative_space < 25 || variant.negative_space > 40) {
    errors.push(
      `Variant ${variant.variant_id}: Negative space ${variant.negative_space}% is outside range 25-40%`
    );
  }
  
  // Check lighting is valid
  const validLighting = ["daylight", "soft-window", "tungsten"];
  if (!validLighting.includes(variant.lighting)) {
    errors.push(`Variant ${variant.variant_id}: Invalid lighting '${variant.lighting}'`);
  }
  
  // Check variant type is valid
  const validTypes = ["macro", "human-in-use", "wide-context"];
  if (!validTypes.includes(variant.variant_type)) {
    errors.push(`Variant ${variant.variant_id}: Invalid variant type '${variant.variant_type}'`);
  }
  
  // Check prompt is not empty
  if (!variant.prompt || variant.prompt.trim().length === 0) {
    errors.push(`Variant ${variant.variant_id}: Empty prompt`);
  }
  
  // Check style tokens exist
  if (!variant.style_tokens || variant.style_tokens.length === 0) {
    errors.push(`Variant ${variant.variant_id}: No style tokens`);
  }
  
  return errors;
}

function validateVarianceRules(variants: ImagePromptVariant[]): string[] {
  const errors: string[] = [];
  
  // Check token differences between variants (≥6 tokens different)
  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const variant1 = variants[i];
      const variant2 = variants[j];
      
      const tokenDiff = calculateTokenDifference(variant1.style_tokens, variant2.style_tokens);
      if (tokenDiff < 6) {
        errors.push(
          `Variants ${variant1.variant_id} and ${variant2.variant_id}: Only ${tokenDiff} tokens different, need ≥6`
        );
      }
      
      const sharedTokens = calculateSharedTokens(variant1.style_tokens, variant2.style_tokens);
      if (sharedTokens > 3) {
        errors.push(
          `Variants ${variant1.variant_id} and ${variant2.variant_id}: ${sharedTokens} shared tokens, need ≤3`
        );
      }
    }
  }
  
  // Check lighting variety (should have different lighting across variants)
  const lightingTypes = variants.map(v => v.lighting);
  const uniqueLighting = new Set(lightingTypes);
  if (uniqueLighting.size < 2) {
    errors.push(`Hook ${variants[0].hook_id}: Insufficient lighting variety (${uniqueLighting.size} unique types)`);
  }
  
  return errors;
}

function calculateTokenDifference(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  // Tokens in set1 but not in set2
  const diff1 = tokens1.filter(token => !set2.has(token)).length;
  
  // Tokens in set2 but not in set1
  const diff2 = tokens2.filter(token => !set1.has(token)).length;
  
  return diff1 + diff2;
}

function calculateSharedTokens(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  return tokens2.filter(token => set1.has(token)).length;
}

export function generateVarianceMetrics(
  generations: ImagePromptGeneration[],
): VarianceMetrics {
  const metrics: VarianceMetrics = {
    tokenDifferences: {},
    sharedTokens: {},
    negativeSpaceRanges: {},
    lightingVariety: {},
  };
  
  for (const generation of generations) {
    const hookId = generation.hook_id;
    const { variants } = generation;
    
    // Calculate token differences and shared tokens
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const variant1 = variants[i];
        const variant2 = variants[j];
        const pairKey = `${variant1.variant_id}-${variant2.variant_id}`;
        
        metrics.tokenDifferences[pairKey] = calculateTokenDifference(
          variant1.style_tokens,
          variant2.style_tokens
        );
        
        metrics.sharedTokens[pairKey] = calculateSharedTokens(
          variant1.style_tokens,
          variant2.style_tokens
        );
      }
    }
    
    // Calculate negative space ranges
    const negativeSpaces = variants.map(v => v.negative_space);
    metrics.negativeSpaceRanges[hookId] = {
      min: Math.min(...negativeSpaces),
      max: Math.max(...negativeSpaces),
    };
    
    // Calculate lighting variety
    metrics.lightingVariety[hookId] = [...new Set(variants.map(v => v.lighting))];
  }
  
  return metrics;
}

export function printValidationReport(
  result: ValidationResult,
  metrics: VarianceMetrics,
): void {
  console.log("=== Image Prompt Variants Validation Report ===");
  console.log(`Overall Status: ${result.isValid ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  
  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  console.log("\n📊 Variance Metrics:");
  console.log("Token Differences:", metrics.tokenDifferences);
  console.log("Shared Tokens:", metrics.sharedTokens);
  console.log("Negative Space Ranges:", metrics.negativeSpaceRanges);
  console.log("Lighting Variety:", metrics.lightingVariety);
}
