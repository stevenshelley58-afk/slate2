/**
 * Runs SSR (Simulated Survey Response) for a given persona and hook combination.
 * This is a mock implementation that generates deterministic results based on seed.
 *
 * @param persona - The persona record
 * @param hook - The hook record
 * @param seed - Seed for deterministic generation
 * @param mode - Mode of operation (default: "mock")
 * @returns SSR metrics and data
 */
export function runSSR(persona: any, hook: any, seed: number, mode: string = "mock") {
  if (mode !== "mock") {
    throw new Error(`Mode ${mode} not yet implemented`);
  }
  
  // Create deterministic RNG from seed
  const rng = createSeededRng(seed);
  
  // Generate deterministic IDs based on persona and hook
  const baseId = `${persona.persona_id}-${hook.hook_id}`;
  const ids = [
    `${baseId}-resp-1`,
    `${baseId}-resp-2`,
    `${baseId}-resp-3`,
    `${baseId}-resp-4`,
    `${baseId}-resp-5`
  ];
  
  // Generate PMF (Probability Mass Function) - 5-point scale
  const pmf = [
    rng() * 0.1, // 1: Very unlikely
    rng() * 0.2, // 2: Unlikely  
    rng() * 0.3, // 3: Neutral
    rng() * 0.3, // 4: Likely
    rng() * 0.4 // 5: Very likely
  ].map(v => Number(v.toFixed(3)));
  
  // Normalize PMF to sum to 1
  const pmfSum = pmf.reduce((sum, val) => sum + val, 0);
  const normalizedPmf = pmf.map(val => Number((val / pmfSum).toFixed(3)));
  
  // Calculate mean (weighted average of 1-5 scale)
  const mean = normalizedPmf.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
  
  // Calculate entropy
  const entropy = -normalizedPmf.reduce((sum, val) => {
    return sum + (val > 0 ? val * Math.log2(val) : 0);
  }, 0);
  
  // Generate KS score (Kolmogorov-Smirnov statistic)
  const ks_score = Number((0.85 + rng() * 0.1).toFixed(3));
  
  // Calculate bimodal score (preference for extreme values)
  const bimodal = Number((normalizedPmf[0] + normalizedPmf[4]).toFixed(3));
  
  // Calculate separation (difference between top 2 responses)
  const sortedPmf = [...normalizedPmf].sort((a, b) => b - a);
  const separation = Number((sortedPmf[0] - sortedPmf[1]).toFixed(3));
  
  return {
    pmf: normalizedPmf,
    mean: Number(mean.toFixed(2)),
    entropy: Number(entropy.toFixed(3)),
    ks_score,
    bimodal,
    separation,
    ids
  };
}

/**
 * Creates a seeded random number generator for deterministic results
 */
function createSeededRng(seed: number) {
  let value = Math.floor(seed) % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}