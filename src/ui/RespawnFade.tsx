import type { CSSProperties } from 'react'
import { useCrash } from '../store/crash'

/**
 * Fondu au noir de réapparition (C5) : masque le repositionnement de l'avion
 * au dernier aérodrome. Piloté par `respawning` du store crash (allumé juste
 * avant le respawn, éteint par `reset()` au moment où l'avion réapparaît) ;
 * l'aller-retour d'opacité est une simple transition CSS. Désactivable via
 * leva (« Vol › crash › respawn : fondu »).
 */
export function RespawnFade() {
  const respawning = useCrash((s) => s.respawning)
  return <div style={{ ...styles.veil, opacity: respawning ? 1 : 0 }} />
}

const styles: Record<string, CSSProperties> = {
  veil: {
    position: 'fixed',
    inset: 0,
    background: '#05080b',
    pointerEvents: 'none',
    zIndex: 40,
    transition: 'opacity 450ms ease-in-out',
  },
}
