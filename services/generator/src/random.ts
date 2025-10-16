export type Rng = () => number;

export function createRng(seed: number): Rng {
  let value = normalizeSeed(seed);
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

export function deriveSeed(seed: number, key: string): number {
  let hash = normalizeSeed(seed);
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 33 + key.charCodeAt(index)) % 2147483647;
  }
  return normalizeSeed(hash);
}

function normalizeSeed(seed: number): number {
  let value = Math.floor(seed) % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return value;
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function shuffleInPlace<T>(rng: Rng, values: T[]): T[] {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function weightedSample<T>(
  rng: Rng,
  population: readonly T[],
  weights: readonly number[],
  count: number,
): T[] {
  if (population.length !== weights.length) {
    throw new Error("Population and weight arrays must align");
  }
  const cumulative = [] as number[];
  let total = 0;
  for (let i = 0; i < weights.length; i += 1) {
    total += weights[i] >= 0 ? weights[i] : 0;
    cumulative.push(total);
  }
  if (total === 0) {
    const uniformWeight = population.length === 0 ? 0 : 1 / population.length;
    return weightedSample(
      rng,
      population,
      population.map(() => uniformWeight),
      count,
    );
  }

  const results: T[] = [];
  const available = population.map((value, index) => ({ value, index }));
  const availableWeights = weights.slice();

  const pick = (): number => {
    const threshold = rng() * total;
    for (let i = 0, acc = 0; i < available.length; i += 1) {
      const weight = availableWeights[available[i].index];
      acc += weight >= 0 ? weight : 0;
      if (threshold <= acc) {
        return i;
      }
    }
    return available.length - 1;
  };

  for (let n = 0; n < count && available.length > 0; n += 1) {
    const pickIndex = pick();
    const { value, index } = available[pickIndex];
    results.push(value);
    total -= availableWeights[index];
    available.splice(pickIndex, 1);
    availableWeights[index] = 0;
  }

  return results;
}

