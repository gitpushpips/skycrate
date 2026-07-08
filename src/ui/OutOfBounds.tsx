import { useEffect } from 'react'
import { useHud } from '../store/hud'
import { useBuild } from '../store/build'
import { useWorldTunables } from '../scenes/worldControls'

/** Marge au-delà du rayon du monde avant l'avertissement (m). */
const OOB_MARGIN = 250
/** Compte à rebours avant désassemblage (s). */
const OOB_TIME = 10
const TICK_MS = 250

/**
 * Hors-limites (règle 10, 3+E) : au-delà du bord du monde ⇒ avertissement +
 * compte à rebours ; à zéro l'avion est désassemblé (retour hangar). Le timer
 * se réarme dès qu'on fait demi-tour. Logique DOM (hors Canvas) cadencée à
 * 4 Hz sur la position publiée par PlaneRig.
 */
export function OutOfBounds() {
  const { terrain } = useWorldTunables()
  const limit = terrain.worldRadius + OOB_MARGIN

  useEffect(() => {
    const id = setInterval(() => {
      const hud = useHud.getState()
      const outside = Math.hypot(hud.x, hud.z) > limit
      if (!outside) {
        if (hud.oobSeconds !== null) useHud.setState({ oobSeconds: null })
        return
      }
      const next = (hud.oobSeconds ?? OOB_TIME) - TICK_MS / 1000
      if (next <= 0) {
        // Désassemblage : fin du vol, retour à l'atelier.
        useHud.setState({ oobSeconds: null })
        useBuild.getState().setMode('hangar')
        return
      }
      useHud.setState({ oobSeconds: next })
    }, TICK_MS)
    return () => {
      clearInterval(id)
      useHud.setState({ oobSeconds: null })
    }
  }, [limit])

  return null
}
