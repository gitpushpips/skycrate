import type { CSSProperties } from 'react'
import { getPart } from '../core/parts'
import { useBuild } from '../store/build'

/**
 * Aide contextuelle de l'éditeur (Jalon 2-C), bas-centre. Suit l'état de pose :
 * pièce de palette choisie ⇒ rappel pose/rotation ; pièce du build sélectionnée
 * ⇒ rappel Del/Ctrl+Z ; sinon invite à choisir une pièce.
 */
export function EditorHint() {
  const selectedPartId = useBuild((s) => s.selectedPartId)
  const selectedNodeId = useBuild((s) => s.selectedNodeId)

  let text: string
  if (selectedPartId && getPart(selectedPartId).category === 'fuselage') {
    text = 'Fuselage aligné automatiquement à l’arrière • clique pour poser • Échap : annuler'
  } else if (selectedPartId) {
    text = 'Survole une pièce pour poser au contact • R : pivoter • Échap : annuler'
  } else if (selectedNodeId) {
    text = 'Gizmo : Déplacer / Tourner (bas-gauche) • Suppr : retirer • Ctrl+Z : annuler • Échap : désélectionner'
  } else {
    text = 'Choisis une pièce dans la palette, ou clique une pièce du build pour la sélectionner'
  }

  return <div style={styles.hint}>{text}</div>
}

const styles: Record<string, CSSProperties> = {
  hint: {
    position: 'fixed',
    bottom: 18,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    maxWidth: '90vw',
    padding: '8px 16px',
    borderRadius: 999,
    background: 'rgba(18, 24, 32, 0.66)',
    color: '#dbe6ef',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'system-ui, sans-serif',
    backdropFilter: 'blur(6px)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'none',
  },
}
