import type { CSSProperties } from 'react'
import { getPart } from '../core/parts'
import type { CompiledAircraft } from '../core/build/compile'

/**
 * Panneau de stats en direct (Jalon 2-B) : poids, carburant, cargo, poussée,
 * vitesse de rupture min, et coût total du build. Bandeau haut du hangar.
 */
export function StatsPanel({ aircraft }: { aircraft: CompiledAircraft }) {
  const s = aircraft.stats
  const cost = aircraft.placed.reduce((sum, p) => sum + getPart(p.partId).cost, 0)
  const snap = Number.isFinite(s.snapSpeedMs) ? `${Math.round(s.snapSpeedMs)} m/s` : '—'

  return (
    <div style={styles.root}>
      <Chip label="POIDS" value={s.totalWeight.toFixed(1)} />
      <Chip label="FUEL" value={(s.totalFuelUnits / 100).toFixed(1)} />
      <Chip label="CARGO" value={s.totalCargo.toFixed(0)} />
      <Chip label="POUSSÉE" value={s.totalThrust.toFixed(0)} />
      <Chip label="RUPTURE" value={snap} />
      <Chip label="COÛT" value={`${cost}`} accent />
    </div>
  )
}

function Chip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ ...styles.chip, ...(accent ? styles.chipAccent : null) }}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 8,
    zIndex: 20,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    pointerEvents: 'none',
  },
  chip: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    minWidth: 70,
    background: 'rgba(18, 24, 32, 0.6)',
    padding: '7px 12px',
    borderRadius: 9,
    backdropFilter: 'blur(4px)',
  },
  chipAccent: { background: 'rgba(224, 162, 58, 0.85)' },
  label: { fontSize: 9.5, letterSpacing: 1.5, color: '#9fb0bd', fontWeight: 600 },
  value: { fontSize: 16, fontWeight: 700, color: '#eef3f6', fontVariantNumeric: 'tabular-nums' },
}
