import type { CSSProperties } from 'react'
import { useBuild } from '../store/build'

/**
 * Barre d'outils de l'éditeur (Jalon 2-C bis), bas-gauche façon Aviassembly :
 * outil de transform (Déplacer / Tourner), pas d'angle du gizmo rotate
 * (90°/45°/Libre, règle 8) et bascule Miroir (pose + déplacement symétriques).
 */
export function EditorTools() {
  const transformMode = useBuild((s) => s.transformMode)
  const setTransformMode = useBuild((s) => s.setTransformMode)
  const rotateSnapDeg = useBuild((s) => s.rotateSnapDeg)
  const cycleRotateSnap = useBuild((s) => s.cycleRotateSnap)
  const mirror = useBuild((s) => s.mirror)
  const toggleMirror = useBuild((s) => s.toggleMirror)

  const snapLabel = rotateSnapDeg === 0 ? 'Libre' : `${rotateSnapDeg}°`

  return (
    <div style={styles.root}>
      <div style={styles.group}>
        <button
          type="button"
          onClick={() => setTransformMode('translate')}
          style={{ ...styles.btn, ...(transformMode === 'translate' ? styles.btnActive : null) }}
        >
          ✥ Déplacer
        </button>
        <button
          type="button"
          onClick={() => setTransformMode('rotate')}
          style={{ ...styles.btn, ...(transformMode === 'rotate' ? styles.btnActive : null) }}
        >
          ⟳ Tourner
        </button>
      </div>

      {transformMode === 'rotate' && (
        <button type="button" onClick={cycleRotateSnap} style={styles.btn} title="Pas d'angle du gizmo">
          Snap : {snapLabel}
        </button>
      )}

      <button
        type="button"
        onClick={toggleMirror}
        style={{ ...styles.btn, ...(mirror ? styles.btnMirror : null) }}
        title="Pose et déplacement symétriques (gauche/droite)"
      >
        ⬌ Miroir {mirror ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    bottom: 16,
    left: 16,
    zIndex: 20,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  group: { display: 'flex', gap: 2, background: 'rgba(18,24,32,0.62)', borderRadius: 10, padding: 3, backdropFilter: 'blur(6px)' },
  btn: {
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(18,24,32,0.62)',
    color: '#cdd9e3',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    backdropFilter: 'blur(6px)',
  },
  btnActive: { background: '#e0a23a', color: '#1a1208' },
  btnMirror: { background: '#4aa3e0', color: '#08243a' },
}
