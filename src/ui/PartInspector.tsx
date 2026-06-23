import type { CSSProperties, ReactNode } from 'react'
import { getPart } from '../core/parts'
import { useBuild } from '../store/build'

/**
 * Inspecteur de pièce (Jalon 2-E) : apparaît quand une pièce du build est
 * sélectionnée. Écrit dans `node.settings` (graphe). Réglages selon la catégorie :
 *  - moteur : sens (normal/inversé — règle 1, la réf. directionnelle suit) + poussée max (règle 2) ;
 *  - surface portante (aile/empennage) : axe de gouverne forcé (sinon auto).
 */
type Axis = 'pitch' | 'roll' | 'yaw'
const AXES: { key: Axis | 'auto'; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'pitch', label: 'Tangage' },
  { key: 'roll', label: 'Roulis' },
  { key: 'yaw', label: 'Lacet' },
]

export function PartInspector() {
  const graph = useBuild((s) => s.aircraft)
  const selectedNodeId = useBuild((s) => s.selectedNodeId)
  const updateSettings = useBuild((s) => s.updateSettings)
  const removeNode = useBuild((s) => s.removeNode)

  const node = graph.nodes.find((n) => n.nodeId === selectedNodeId)
  if (!node) return null
  const part = getPart(node.partId)
  const settings = node.settings ?? {}
  const isRoot = node.nodeId === graph.rootId

  return (
    <div style={styles.root}>
      <div style={styles.head}>
        <span style={styles.name}>{part.name}</span>
        <span style={styles.cat}>{part.category}</span>
      </div>

      {part.category === 'engine' && (
        <>
          <Field label="Sens du moteur">
            <div style={styles.seg}>
              <SegBtn
                active={!settings.engineReversed}
                onClick={() => updateSettings(node.nodeId, { engineReversed: false })}
              >
                Normal
              </SegBtn>
              <SegBtn
                active={!!settings.engineReversed}
                onClick={() => updateSettings(node.nodeId, { engineReversed: true })}
              >
                Inversé
              </SegBtn>
            </div>
          </Field>
          <Field label={`Poussée max — ${Math.round((settings.thrustLimit ?? 1) * 100)} %`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.thrustLimit ?? 1}
              onChange={(e) => updateSettings(node.nodeId, { thrustLimit: Number(e.target.value) })}
              style={styles.range}
            />
          </Field>
        </>
      )}

      {(part.category === 'wing' || part.category === 'stabilizer') && (
        <Field label="Axe de gouverne">
          <div style={styles.seg}>
            {AXES.map((a) => (
              <SegBtn
                key={a.key}
                active={(settings.controlAxis ?? 'auto') === a.key}
                onClick={() =>
                  updateSettings(node.nodeId, {
                    controlAxis: a.key === 'auto' ? undefined : a.key,
                  })
                }
              >
                {a.label}
              </SegBtn>
            ))}
          </div>
        </Field>
      )}

      {part.category !== 'engine' &&
        part.category !== 'wing' &&
        part.category !== 'stabilizer' && <p style={styles.none}>Aucun réglage pour cette pièce.</p>}

      {!isRoot && (
        <button type="button" style={styles.remove} onClick={() => removeNode(node.nodeId)}>
          Retirer la pièce (Suppr)
        </button>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  )
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} style={{ ...styles.segBtn, ...(active ? styles.segBtnActive : null) }}>
      {children}
    </button>
  )
}

const panel = 'rgba(18, 24, 32, 0.62)'
const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    top: 64,
    right: 16,
    width: 232,
    zIndex: 20,
    background: panel,
    borderRadius: 12,
    padding: 12,
    backdropFilter: 'blur(6px)',
    fontFamily: 'system-ui, sans-serif',
    color: '#eef3f6',
  },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  name: { fontWeight: 700, fontSize: 14 },
  cat: { fontSize: 10, color: '#9fb0bd', textTransform: 'uppercase', letterSpacing: 1 },
  field: { marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 11, color: '#aebbc6', fontWeight: 600 },
  seg: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  segBtn: {
    flex: '1 0 auto',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.07)',
    color: '#aebbc6',
    padding: '6px 8px',
    borderRadius: 7,
    fontSize: 11,
    fontWeight: 600,
  },
  segBtnActive: { background: '#e0a23a', color: '#1a1208' },
  range: { width: '100%', accentColor: '#e0a23a' },
  none: { fontSize: 12, color: '#9fb0bd', margin: '2px 0 10px' },
  remove: {
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(214,84,72,0.85)',
    color: '#fff',
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    marginTop: 2,
  },
}
