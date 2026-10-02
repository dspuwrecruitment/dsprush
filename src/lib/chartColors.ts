// Validated categorical palette (dataviz skill reference palette, light mode).
// Order is the CVD-safety mechanism - do not reorder or cycle arbitrarily.
export const CATEGORICAL_PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

export const NEUTRAL_COLOR = '#a3a298' // gray for Other / Not set

/**
 * Assigns each label a stable color based on alphabetical order, not display
 * rank, so a category keeps its color across re-sorts or data changes.
 * "Other" and "Not set" always get the neutral gray, never a hue slot.
 */
export function assignColors(labels: string[]): Map<string, string> {
  const real = labels.filter((l) => l !== 'Other' && l !== 'Not set').sort((a, b) => a.localeCompare(b))
  const map = new Map<string, string>()
  real.forEach((label, i) => map.set(label, CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]))
  if (labels.includes('Other')) map.set('Other', NEUTRAL_COLOR)
  if (labels.includes('Not set')) map.set('Not set', NEUTRAL_COLOR)
  return map
}
