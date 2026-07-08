import { create } from 'zustand'

/**
 * État de découverte du monde (3+E) : aérodromes découverts (brouillard de
 * découverte), cellules survolées (128 m — révèle la carte), marqueur posable
 * et ouverture de la carte. Persisté en localStorage PAR SEED (changer de seed
 * repart d'un monde inconnu ; revenir au même seed retrouve sa découverte).
 */
export const VISIT_CELL = 128

interface WorldUiState {
  seed: number
  discovered: Record<string, true>
  visited: Record<string, true>
  marker: [number, number] | null
  mapOpen: boolean
  /** Charge (ou réinitialise) la découverte pour ce seed. */
  ensureSeed(seed: number): void
  discover(id: string): void
  visitAround(x: number, z: number): void
  setMarker(p: [number, number] | null): void
  setMapOpen(open: boolean): void
}

const storageKey = (seed: number) => `skycrate.world.${seed}`

interface SavedState {
  discovered: Record<string, true>
  visited: Record<string, true>
  marker: [number, number] | null
}

function load(seed: number): SavedState | null {
  try {
    const raw = localStorage.getItem(storageKey(seed))
    if (!raw) return null
    const p = JSON.parse(raw) as SavedState
    if (typeof p !== 'object' || p === null) return null
    return {
      discovered: p.discovered ?? {},
      visited: p.visited ?? {},
      marker: Array.isArray(p.marker) ? p.marker : null,
    }
  } catch {
    return null
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSave(get: () => WorldUiState) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = get()
    try {
      localStorage.setItem(
        storageKey(s.seed),
        JSON.stringify({ discovered: s.discovered, visited: s.visited, marker: s.marker }),
      )
    } catch {
      /* stockage plein/indisponible : la découverte reste en mémoire */
    }
  }, 1200)
}

export const useWorldUi = create<WorldUiState>((set, get) => ({
  seed: 0,
  discovered: {},
  visited: {},
  marker: null,
  mapOpen: false,

  ensureSeed: (seed) => {
    if (get().seed === seed) return
    const saved = load(seed)
    set({
      seed,
      discovered: { 'ap.start': true, ...(saved?.discovered ?? {}) },
      visited: saved?.visited ?? {},
      marker: saved?.marker ?? null,
    })
  },

  discover: (id) => {
    if (get().discovered[id]) return
    set((s) => ({ discovered: { ...s.discovered, [id]: true } }))
    scheduleSave(get)
  },

  visitAround: (x, z) => {
    const cx = Math.floor(x / VISIT_CELL)
    const cz = Math.floor(z / VISIT_CELL)
    const v = get().visited
    let changed = false
    const next = { ...v }
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${cx + dx},${cz + dz}`
        if (!next[key]) {
          next[key] = true
          changed = true
        }
      }
    }
    if (changed) {
      set({ visited: next })
      scheduleSave(get)
    }
  },

  setMarker: (p) => {
    set({ marker: p })
    scheduleSave(get)
  },

  setMapOpen: (open) => set({ mapOpen: open }),
}))
