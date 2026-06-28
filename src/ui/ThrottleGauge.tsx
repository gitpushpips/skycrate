import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useThrottle } from '../store/throttle'

/**
 * Jauge de régime moteur (hangar) : prévisualise l'animation des hélices et des
 * flammes en réglant le `level` du store partagé. Le bouton **PC** allume la
 * postcombustion (flamme) pour les moteurs équipés. En vol, c'est `PlaneRig` qui
 * pilote ce store (la jauge n'est montée qu'au hangar). Remise à zéro à l'entrée.
 */
export function ThrottleGauge() {
  const level = useThrottle((s) => s.level)
  const boost = useThrottle((s) => s.boost)
  const setLevel = useThrottle((s) => s.setLevel)
  const setBoost = useThrottle((s) => s.setBoost)

  useEffect(() => {
    setLevel(0)
    setBoost(false)
  }, [setLevel, setBoost])

  return (
    <div style={styles.root}>
      <span style={styles.label}>RÉGIME</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        style={styles.slider}
      />
      <span style={styles.pct}>{Math.round(level * 100)}%</span>
      <button
        type="button"
        onClick={() => setBoost(!boost)}
        style={{ ...styles.pc, ...(boost ? styles.pcOn : null) }}
        title="Postcombustion (aperçu)"
      >
        PC
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    bottom: 54,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(18, 24, 32, 0.66)',
    borderRadius: 999,
    padding: '7px 14px',
    backdropFilter: 'blur(6px)',
    fontFamily: 'system-ui, sans-serif',
  },
  label: { fontSize: 10, letterSpacing: 1.5, color: '#9fb0bd', fontWeight: 700 },
  slider: { width: 160, accentColor: '#e0a23a' },
  pct: { fontSize: 12, fontWeight: 700, color: '#eef3f6', width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  pc: {
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.1)',
    color: '#cdd9e3',
    fontWeight: 800,
    fontSize: 11,
    padding: '5px 10px',
    borderRadius: 8,
    letterSpacing: 1,
  },
  pcOn: { background: '#ff7a3a', color: '#2a1003' },
}
