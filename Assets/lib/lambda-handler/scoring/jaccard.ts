/**
 * Jaccard similarity coefficient between two collections of strings.
 *
 * Defined as |A ∩ B| / |A ∪ B|.
 *
 * Edge cases:
 *  - Both inputs empty           -> 0 (NOT NaN)
 *  - One input empty             -> 0
 *  - Identical sets              -> 1
 *  - Disjoint sets               -> 0
 *
 * Accepts either a `Set<string>` or a `string[]` for each argument.
 * Arrays are normalized to Sets, so duplicate entries in an array
 * are deduplicated before the calculation.
 *
 * Pure function — has no external dependencies and no side effects.
 *
 * @param a first collection of strings (Set or array)
 * @param b second collection of strings (Set or array)
 * @returns Jaccard similarity in the inclusive range [0, 1]
 */
export function jaccard(
  a: Set<string> | string[],
  b: Set<string> | string[],
): number {
  const setA = a instanceof Set ? a : new Set(a);
  const setB = b instanceof Set ? b : new Set(b);

  // Both empty -> defined as 0 to avoid 0/0 = NaN.
  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  // Iterate the smaller set for efficiency.
  const [smaller, larger] =
    setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const value of smaller) {
    if (larger.has(value)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  if (unionSize === 0) {
    return 0;
  }

  return intersectionSize / unionSize;
}
