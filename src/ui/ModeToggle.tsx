import type { CSSProperties } from 'react'
import { useBuild } from '../store/build'

/**
 * Bascule Hangar ↔ Vol d'essai (Jalon 2-B). En hangar : bouton « Vol d'essai »
 * (haut-droite) ; en vol : « Retour hangar » (haut-gauche).
 */
export function ModeToggle() {
  const mode = useBuild((s) => s.mode)
  const setMode = useBuild((s) => s.setMode)
  const isEmpty = useBuild((s) => s.aircraft.nodes.length === 0)

  if (mode === 'hangar') {
    return (
      <button
        type="button"
        disabled={isEmpty}
        onClick={() => !isEmpty && setMode('flight')}
        style={{ ...styles.btn, ...styles.fly, ...(isEmpty ? styles.disabled : null) }}
        title={isEmpty ? 'Construis un avion pour l’essayer' : undefined}
      >
        ▶ Vol d'essai
      </button>
    )
  }
  return (
    <button type="button" onClick={() => setMode('hangar')} style={{ ...styles.btn, ...styles.back }}>
      ⮌ Retour hangar
    </button>
  )
}

const styles: Record<string, CSSProperties> = {
  btn: {
    position: 'fixed',
    top: 16,
    zIndex: 30,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    padding: '10px 18px',
    borderRadius: 10,
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  },
  fly: { right: 64, background: '#5bd06a', color: '#0c2410' }, // room pour l'engrenage (S6)
  back: { left: 16, background: 'rgba(18,24,32,0.8)', color: '#eef3f6' },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
}
