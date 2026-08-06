'use client'

// The anonymous name + color assigned to a student the first time they join a
// Discussion Room / Virtual Library is stored per-gender in localStorage so the
// same identity is reused on every future visit (never regenerated).
//
// Why per-gender: the join flow asks the user to pick male/female each time.
// Keeping one identity per gender means a user who switches back to the gender
// they used before still gets their original anonymous name back.

export interface SavedAnonymousIdentity {
  name: string
  color: string
}

const STORAGE_KEY = 'studyroom_anonymous_identity_v1'

interface StoredEntry extends SavedAnonymousIdentity {
  updatedAt: number
}

type IdentityStore = { male?: StoredEntry; female?: StoredEntry }

function readStore(): IdentityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: IdentityStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

export function getSavedAnonymousIdentity(gender: 'male' | 'female'): SavedAnonymousIdentity | null {
  const entry = readStore()[gender]
  return entry && entry.name && entry.color ? { name: entry.name, color: entry.color } : null
}

export function saveAnonymousIdentity(gender: 'male' | 'female', identity: SavedAnonymousIdentity): void {
  if (!identity?.name || !identity?.color) return
  const store = readStore()
  store[gender] = { name: identity.name, color: identity.color, updatedAt: Date.now() }
  writeStore(store)
}

// The most recently used identity, used to pre-select the gender card and show
// the saved name in the join modal.
export function getLastSavedIdentity(): { gender: 'male' | 'female'; name: string } | null {
  const store = readStore()
  const male = store.male
  const female = store.female
  const entries = [male, female].filter(Boolean) as StoredEntry[]
  if (entries.length === 0) return null
  const latest = entries.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b))
  return { gender: latest === male ? 'male' : 'female', name: latest.name }
}
