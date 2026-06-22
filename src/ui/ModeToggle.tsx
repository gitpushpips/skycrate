import type { CSSProperties } from 'react'
import { useBuild } from '../store/build'

/**
 * Bascule Hangar ↔ Vol d'essai (Jalon 2-B). En hangar : bouton « Vol d'essai »
 * (haut-droite) ; en vol : « Retour hangar » (haut-gauche).
 */
export function ModeToggle() {
  const mode = useBuild((s) => s.mode)
  const setMode = useBuild((s) => s.setMode)

  if (mode === 'hangar') {
    return (
      <button type="button" onClick={() => setMode('flight')} style={{ ...styles.btn, ...styles.fly }}>
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
  fly: { right: 16, background: '#5bd06a', color: '#0c2410' },
  back: { left: 16, background: 'rgba(18,24,32,0.8)', color: '#eef3f6' },
}
