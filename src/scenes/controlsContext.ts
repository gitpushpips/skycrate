import { createContext, useContext } from 'react'
import type { MutableRefObject } from 'react'
import type { Deflections } from '../core/physics/aerodynamics'

/**
 * Déflexions courantes des gouvernes (radians), partagées entre la physique
 * (PlaneRig) et le visuel (gouvernes animées). Référence mutable mise à jour
 * chaque frame ⇒ aucune re-render React.
 */
export type ControlsRef = MutableRefObject<Deflections>

export const ControlsContext = createContext<ControlsRef | null>(null)

export function useControlsRef(): ControlsRef | null {
  return useContext(ControlsContext)
}
