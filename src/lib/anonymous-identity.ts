// Anonymous identity generator for Discussion Rooms & Virtual Libraries.
// Combines gender-based names with a color to create unique display personas.
// Name pools: exactly 10 male and 10 female names, allotted randomly per join.

const MALE_NAMES = [
  'Aarav', 'Rahul', 'Arjun', 'Vikram', 'Kabir',
  'Rohan', 'Aditya', 'Karan', 'Sameer', 'Dev',
]

const FEMALE_NAMES = [
  'Ananya', 'Priya', 'Sneha', 'Kavya', 'Meera',
  'Divya', 'Pooja', 'Ishita', 'Riya', 'Neha',
]

// Fallback pool (gender unknown) — union of both lists.
const NEUTRAL_NAMES = [...MALE_NAMES, ...FEMALE_NAMES]

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#eab308', '#10b981',
]

const GENDERS = ['male', 'female'] as const

export type AnonymousGender = 'male' | 'female' | 'neutral'

export interface AnonymousIdentity {
  name: string
  color: string
  gender: AnonymousGender
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Build name+color permutations; keep picking combos until a fresh one is found.
export function randomAnonymousIdentity(
  gender: AnonymousGender | null = null,
  taken: { name: string; color: string }[] = [],
): AnonymousIdentity {
  const g: AnonymousGender = gender || pick(GENDERS)
  const namePool = g === 'male' ? MALE_NAMES : g === 'female' ? FEMALE_NAMES : NEUTRAL_NAMES

  const takenSet = new Set(taken.map(t => `${t.name}:${t.color}`))

  let identity: AnonymousIdentity | null = null
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate: AnonymousIdentity = {
      name: pick(namePool),
      color: pick(COLORS),
      gender: g,
    }
    if (!takenSet.has(`${candidate.name}:${candidate.color}`)) {
      identity = candidate
      break
    }
  }

  // Fallback if permutations are exhausted
  if (!identity) {
    identity = { name: `${pick(namePool)}${Math.floor(Math.random() * 99)}`, color: pick(COLORS), gender: g }
  }

  return identity
}