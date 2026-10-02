export interface MatchCandidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
  is_coffee_chat: boolean
  is_rush_candidate: boolean
}

export function normalizeName(first: string, last: string): string {
  return `${first} ${last}`.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function buildNameMap<T extends MatchCandidate>(existing: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const c of existing) {
    const key = normalizeName(c.first_name, c.last_name)
    const arr = map.get(key)
    if (arr) arr.push(c)
    else map.set(key, [c])
  }
  return map
}

export interface MatchResolution<T> {
  match: T | null
  ambiguous: boolean
}

/**
 * Resolves a CSV row to an existing candidate by name, using email only to
 * disambiguate when multiple existing candidates share that name. Never
 * guesses: an unresolved multi-match is reported as ambiguous rather than
 * merged with the wrong person.
 */
export function resolveMatch<T extends MatchCandidate>(
  nameMap: Map<string, T[]>,
  firstName: string,
  lastName: string,
  email: string | null,
): MatchResolution<T> {
  const candidates = nameMap.get(normalizeName(firstName, lastName)) ?? []
  if (candidates.length === 0) return { match: null, ambiguous: false }
  if (candidates.length === 1) return { match: candidates[0], ambiguous: false }

  const emailNorm = email?.trim().toLowerCase()
  if (emailNorm) {
    const emailMatches = candidates.filter((c) => c.email?.trim().toLowerCase() === emailNorm)
    if (emailMatches.length === 1) return { match: emailMatches[0], ambiguous: false }
  }
  return { match: null, ambiguous: true }
}
