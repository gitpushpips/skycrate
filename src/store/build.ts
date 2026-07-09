import { create } from 'zustand'
import { EMPTY_AIRCRAFT } from '../core/build/j1'
import { descendantsOf } from '../core/build/graph'
import { computeTwin } from '../core/build/mirror'
import { getPart } from '../core/parts'
import type { Aircraft, PartNode, PartSettings } from '../core/build/graph'

/**
 * État de l'éditeur (Jalon 2). Le graphe `aircraft` est compilé à la volée par App.
 * Édition : pose/suppression, sélection, transform au gizmo (translate/rotate),
 * miroir (paires symétriques), annulation **un seul pas**. `selectedPartId` = pièce
 * de la palette à poser ; `selectedNodeId` = pièce du build sélectionnée.
 */
export type GameMode = 'hangar' | 'flight'
export type TransformMode = 'translate' | 'rotate'

interface BuildState {
  aircraft: Aircraft
  mode: GameMode
  selectedPartId: string | null
  selectedNodeId: string | null
  /** Outil de transform du gizmo. */
  transformMode: TransformMode
  /** Pas d'angle du gizmo rotate (deg) ; 0 = libre. Cycle 90/45/0 (règle 8). */
  rotateSnapDeg: number
  /** Mode miroir : pose + déplacement symétriques (plan X=0). */
  mirror: boolean
  /** Snapshot pour l'annulation (un seul pas). */
  past: Aircraft | null

  setMode: (mode: GameMode) => void
  setAircraft: (aircraft: Aircraft) => void
  selectPart: (partId: string | null) => void
  selectNode: (nodeId: string | null) => void
  setTransformMode: (mode: TransformMode) => void
  cycleRotateSnap: () => void
  toggleMirror: () => void
  /** Pose une pièce comme enfant de `parentId`, à `position`/`rotation` (repère du parent). */
  addPart: (
    parentId: string,
    partId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
  ) => void
  /** Retire une pièce et tout son sous-arbre (+ son jumeau miroir ; jamais la racine). */
  removeNode: (nodeId: string) => void
  /** Déplace/oriente une pièce (gizmo) ; propage au jumeau miroir. Édition « live ». */
  updateNode: (nodeId: string, patch: { position?: [number, number, number]; rotation?: [number, number, number] }) => void
  /** Met à jour les réglages d'instance d'une pièce (moteur inverse/limite). */
  updateSettings: (nodeId: string, patch: Partial<PartSettings>) => void
  /** Capture un point d'annulation (appelé au début d'un drag de gizmo). */
  pushHistory: () => void
  /** Annule la dernière édition (un seul pas). */
  undo: () => void
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `n${Math.random().toString(36).slice(2, 10)}`
}

export const useBuild = create<BuildState>((set) => ({
  aircraft: EMPTY_AIRCRAFT,
  mode: 'hangar',
  selectedPartId: null,
  selectedNodeId: null,
  transformMode: 'translate',
  rotateSnapDeg: 90,
  mirror: false,
  past: null,

  setMode: (mode) => set({ mode }),
  setAircraft: (aircraft) => set({ aircraft, past: null, selectedNodeId: null }),
  selectPart: (selectedPartId) => set({ selectedPartId, selectedNodeId: null }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  setTransformMode: (transformMode) => set({ transformMode }),
  cycleRotateSnap: () => set((s) => ({ rotateSnapDeg: s.rotateSnapDeg === 90 ? 45 : s.rotateSnapDeg === 45 ? 0 : 90 })),
  toggleMirror: () => set((s) => ({ mirror: !s.mirror })),

  addPart: (parentId, partId, position, rotation = [0, 0, 0]) =>
    set((s) => {
      const past = structuredClone(s.aircraft)
      // Page blanche (S4-A) : la 1re pièce (un cockpit) devient la RACINE. Elle
      // n'a pas de parent et ne se mirrore pas (posée sur l'axe).
      if (s.aircraft.nodes.length === 0) {
        if (getPart(partId).category !== 'cockpit') return {}
        const root: PartNode = { nodeId: newId(), partId, parentId: null, position, rotation }
        return {
          past,
          aircraft: { ...s.aircraft, rootId: root.nodeId, nodes: [root] },
          selectedNodeId: root.nodeId,
          selectedPartId: null,
        }
      }
      const node: PartNode = { nodeId: newId(), partId, parentId, position, rotation }
      let nodes = [...s.aircraft.nodes, node]
      // Miroir : pose aussi le jumeau symétrique (sauf pièce symétrique sur l'axe).
      if (s.mirror) {
        const twin = computeTwin(s.aircraft, parentId, partId, position, rotation)
        if (twin) {
          const twinNode: PartNode = {
            nodeId: newId(),
            partId,
            parentId: twin.twinParentId,
            position: twin.position,
            rotation: twin.rotation,
            mirrorId: node.nodeId,
            mirrored: !node.mirrored,
          }
          node.mirrorId = twinNode.nodeId
          nodes = [...nodes, twinNode]
        }
      }
      return {
        past,
        aircraft: { ...s.aircraft, nodes },
        selectedNodeId: node.nodeId,
        selectedPartId: null,
      }
    }),

  removeNode: (nodeId) =>
    set((s) => {
      // Retirer la RACINE (S4-A) ⇒ retour page blanche (tout le sous-arbre part).
      if (nodeId === s.aircraft.rootId) {
        return {
          past: structuredClone(s.aircraft),
          aircraft: { ...s.aircraft, rootId: '', nodes: [] },
          selectedNodeId: null,
        }
      }
      const node = s.aircraft.nodes.find((n) => n.nodeId === nodeId)
      const dead = new Set([nodeId, ...descendantsOf(s.aircraft, nodeId).map((n) => n.nodeId)])
      // Retirer aussi le jumeau miroir (+ son sous-arbre).
      if (node?.mirrorId && node.mirrorId !== s.aircraft.rootId) {
        dead.add(node.mirrorId)
        descendantsOf(s.aircraft, node.mirrorId).forEach((n) => dead.add(n.nodeId))
      }
      return {
        past: structuredClone(s.aircraft),
        aircraft: { ...s.aircraft, nodes: s.aircraft.nodes.filter((n) => !dead.has(n.nodeId)) },
        selectedNodeId: null,
      }
    }),

  // Transform « live » au gizmo (ne touche pas `past` : un point d'annulation est
  // capturé au début du drag via `pushHistory`). Propage au jumeau miroir.
  updateNode: (nodeId, patch) =>
    set((s) => {
      const node = s.aircraft.nodes.find((n) => n.nodeId === nodeId)
      if (!node) return {}
      const position = patch.position ?? node.position
      const rotation = patch.rotation ?? node.rotation
      let nodes = s.aircraft.nodes.map((n) =>
        n.nodeId === nodeId ? { ...n, position, rotation } : n,
      )
      if (node.mirrorId && node.parentId) {
        const twin = computeTwin({ ...s.aircraft, nodes }, node.parentId, node.partId, position, rotation)
        if (twin) {
          nodes = nodes.map((n) =>
            n.nodeId === node.mirrorId
              ? { ...n, position: twin.position, rotation: twin.rotation }
              : n,
          )
        }
      }
      return { aircraft: { ...s.aircraft, nodes } }
    }),

  // Réglage « live » (ne touche pas `past` ⇒ pas de spam d'undo sur les curseurs).
  updateSettings: (nodeId, patch) =>
    set((s) => ({
      aircraft: {
        ...s.aircraft,
        nodes: s.aircraft.nodes.map((n) =>
          n.nodeId === nodeId ? { ...n, settings: { ...n.settings, ...patch } } : n,
        ),
      },
    })),

  pushHistory: () => set((s) => ({ past: structuredClone(s.aircraft) })),

  undo: () =>
    set((s) => (s.past ? { aircraft: s.past, past: null, selectedNodeId: null } : {})),
}))
