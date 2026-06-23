import { useState } from 'react'
import type { CSSProperties } from 'react'
import { getPartsByCategory } from '../core/parts'
import type { PartCategory } from '../core/parts'
import { useBuild } from '../store/build'

/**
 * Palette de pièces (Jalon 2-B/2-C/2-D) : onglets de catégorie + grille de pièces
 * avec coût. La sélection alimente la pose (2-C). Une pièce trop chère pour le
 * budget restant (`available`, 2-D) est grisée et non sélectionnable.
 */
const CATEGORIES: { key: PartCategory; label: string }[] = [
  { key: 'fuselage', label: 'Fuselage' },
  { key: 'wing', label: 'Aile' },
  { key: 'stabilizer', label: 'Empennage' },
  { key: 'engine', label: 'Moteur' },
  { key: 'landingGear', label: 'Train' },
]

export function PartsPalette({ available }: { available: number }) {
  const [cat, setCat] = useState<PartCategory>('wing')
  const selected = useBuild((s) => s.selectedPartId)
  const selectPart = useBuild((s) => s.selectPart)
  // Triées par palier (T0 → T7) pour lire la progression dans l'onglet.
  const parts = [...getPartsByCategory(cat)].sort((a, b) => a.tier.localeCompare(b.tier))

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
          const affordable = p.cost <= available
          return (
            <button
              key={p.id}
              type="button"
              disabled={!affordable}
              onClick={() => affordable && selectPart(active ? null : p.id)}
              style={{
                ...styles.cell,
                ...(active ? styles.cellActive : null),
                ...(affordable ? null : styles.cellDisabled),
              }}
              title={affordable ? p.description : `Budget insuffisant (${p.cost} coins)`}
            >
              <span style={styles.cellName}>
                <span style={styles.tierBadge}>{p.tier}</span>
                {p.name}
              </span>
              <span style={{ ...styles.cellCost, ...(affordable ? null : styles.cellCostOver) }}>
                {p.cost} ⛀
              </span>
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
  cellActive: { border: '1px solid #e0a23a', background: 'rgba(224,162,58,0.18)' },
  cellDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  cellName: { fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  tierBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#1a1208',
    background: '#8fa7d6',
    borderRadius: 4,
    padding: '1px 4px',
    letterSpacing: 0.5,
  },
  cellCost: { fontSize: 12, color: '#9fb0bd', fontVariantNumeric: 'tabular-nums' },
  cellCostOver: { color: '#e8857b' },
}
