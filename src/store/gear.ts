import { create } from 'zustand'

/**
 * État du train d'atterrissage (S4-D). Global à l'avion (light) :
 *   - `down` : consigne de sortie (touche G) — n'affecte que les pièces
 *     `retractable` ; rentré ⇒ roues cachées ET colliders retirés (le ventre
 *     frotte). Les trains fixes restent toujours sortis.
 *   - `broken` : rupture light (règle utilisateur) — atterrissage trop dur
 *     (vitesse verticale > strength × facteur leva) ⇒ toutes les roues perdues,
 *     l'avion glisse sur le ventre. Réparé au reset (R) / retour hangar.
 */
interface GearState {
  down: boolean
  broken: boolean
  toggle: () => void
  setBroken: (broken: boolean) => void
  reset: () => void
}

export const useGear = create<GearState>((set) => ({
  down: true,
  broken: false,
  toggle: () => set((s) => ({ down: !s.down })),
  setBroken: (broken) => set({ broken }),
  reset: () => set({ down: true, broken: false }),
}))
