import { useState } from 'react'
import type { CSSProperties } from 'react'
import { getPartsByCategory } from '../core/parts'
import type { PartCategory } from '../core/parts'
import { useBuild } from '../store/build'

/**
 * Palette de pièces (Jalon 2-B) : onglets de catégorie + grille de pièces avec
 * coût. La sélection alimentera la pose (Jalon 2-C). Alimentée par `core/parts`.
 */
const CATEGORIES: { key: PartCategory; label: string }[] = [
  { key: 'fuselage', label: 'Fuselage' },
  { key: 'wing', label: 'Aile' },
  { key: 'stabilizer', label: 'Empennage' },
  { key: 'engine', label: 'Moteur' },
  { key: 'landingGear', label: 'Train' },
]

export function PartsPalette() {
  const [cat, setCat] = useState<PartCategory>('wing')
  const selected = useBuild((s) => s.selectedPartId)
  const selectPart = useBuild((s) => s.selectPart)
  const parts = getPartsByCategory(cat)

  return (
    <div style={styles.root}>
      <div style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCat(c.key)}
            style={{ ...styles.tab, ...(cat === c.key ? styles.tabActive : null) }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {parts.map((p) => {
          const active = selected === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPart(active ? null : p.id)}
              style={{ ...styles.cell, ...(active ? styles.cellActive : null) }}
              title={p.description}
            >
              <span style={styles.cellName}>{p.name}</span>
              <span style={styles.cellCost}>{p.cost} ⛀</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const panel = 'rgba(18, 24, 32, 0.62)'
const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 232,
    zIndex: 20,
    background: panel,
    borderRadius: 12,
    padding: 10,
    backdropFilter: 'blur(6px)',
    fontFamily: 'system-ui, sans-serif',
  },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tab: {
    flex: '1 0 auto',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.07)',
    color: '#aebbc6',
    padding: '5px 8px',
    borderRadius: 7,
    fontSize: 11,
    fontWeight: 600,
  },
  tabActive: { background: '#e0a23a', color: '#1a1208' },
  grid: { display: 'flex', flexDirection: 'column', gap: 6 },
  cell: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid transparent',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    color: '#eef3f6',
    padding: '9px 11px',
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'left',
  },
  cellActive: { borderColor: '#e0a23a', background: 'rgba(224,162,58,0.18)' },
  cellName: { fontWeight: 600 },
  cellCost: { fontSize: 12, color: '#9fb0bd', fontVariantNumeric: 'tabular-nums' },
}
