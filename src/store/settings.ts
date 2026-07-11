import { create } from 'zustand'
import type { RenderQuality } from '../scenes/renderQuality'

/**
 * Paramètres JOUEUR (S6) — surface propre, accessible EN JEU (le panneau leva
 * reste un outil de calibrage dev, masqué par défaut en prod mais ouvrable
 * depuis ce menu). `quality` + `assist` sont persistés (localStorage) ; `open`
 * (menu ouvert) et `showLeva` (panneau dev visible) sont d'état de session.
 */
const KEY = 'skycrate.settings'
const QUALITIES: RenderQuality[] = ['performance', 'équilibré', 'qualité']

interface Persisted {
  quality: RenderQuality
  assist: boolean
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>
      return {
        quality: QUALITIES.includes(p.quality as RenderQuality)
          ? (p.quality as RenderQuality)
          : 'performance',
        assist: typeof p.assist === 'boolean' ? p.assist : true,
      }
    }
  } catch {
    // localStorage indisponible / JSON corrompu ⇒ défauts.
  }
  return { quality: 'performance', assist: true }
}

function save(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // ignore (mode privé, quota…)
  }
}

interface SettingsState extends Persisted {
  /** Menu paramètres ouvert. */
  open: boolean
  /** Panneau leva (réglages avancés / dev) visible. */
  showLeva: boolean
  setQuality: (quality: RenderQuality) => void
  setAssist: (assist: boolean) => void
  setOpen: (open: boolean) => void
  toggleLeva: () => void
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  open: false,
  showLeva: import.meta.env.DEV, // visible d'office en dev, ouvrable en prod
  setQuality: (quality) => {
    set({ quality })
    save({ quality, assist: get().assist })
  },
  setAssist: (assist) => {
    set({ assist })
    save({ quality: get().quality, assist })
  },
  setOpen: (open) => set({ open }),
  toggleLeva: () => set((s) => ({ showLeva: !s.showLeva })),
}))
