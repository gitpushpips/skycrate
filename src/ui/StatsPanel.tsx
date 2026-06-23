import type { CSSProperties } from 'react'
import type { CompiledAircraft } from '../core/build/compile'

/**
 * Panneau de stats en direct (Jalon 2-B/2-D) : poids, carburant, cargo, poussée,
 * vitesse de rupture min, coût du build, et **coins restants / budget** (le budget
 * est un plafond ; il se rembourse au retrait d'une pièce). Bandeau haut du hangar.
 */
export function StatsPanel({
  aircraft,
  budget,
  available,
}: {
  aircraft: CompiledAircraft
  budget: number
  available: number
}) {
  const s = aircraft.stats
  const snap = Number.isFinite(s.snapSpeedMs) ? `${Math.round(s.snapSpeedMs)} m/s` : '—'

  return (
    <div style={styles.root}>
      <Chip label="POIDS" value={s.totalWeight.toFixed(1)} />
      <Chip label="FUEL" value={(s.totalFuelUnits / 100).toFixed(1)} />
      <Chip label="CARGO" value={s.totalCargo.toFixed(0)} />
      <Chip label="POUSSÉE" value={s.totalThrust.toFixed(0)} />
      <Chip label="RUPTURE" value={snap} />
      <Chip label="COÛT" value={`${s.totalCost}`} />
      <Chip label="COINS" value={`${available} / ${budget}`} accent danger={available <= 0} />
    </div>
  )
}

function Chip({
  label,
  value,
  accent,
  danger,
}: {
  label: string
  value: string
  accent?: boolean
  danger?: boolean
}) {
  const tint = danger ? styles.chipDanger : accent ? styles.chipAccent : null
  return (
    <div style={{ ...styles.chip, ...tint }}>
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
  chipDanger: { background: 'rgba(214, 84, 72, 0.9)' },
  label: { fontSize: 9.5, letterSpacing: 1.5, color: '#9fb0bd', fontWeight: 600 },
  value: { fontSize: 16, fontWeight: 700, color: '#eef3f6', fontVariantNumeric: 'tabular-nums' },
}
