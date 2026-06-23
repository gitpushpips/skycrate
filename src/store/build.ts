import { create } from 'zustand'
import { J1_AIRCRAFT } from '../core/build/j1'
import { descendantsOf } from '../core/build/graph'
import type { Aircraft, PartNode } from '../core/build/graph'

/**
 * État de l'éditeur (Jalon 2). Le graphe `aircraft` est compilé à la volée par App.
 * Édition (2-C) : ajout/suppression de pièce, sélection, annulation **un seul pas**
 * (comme l'original). `selectedPartId` = pièce de la palette à poser ;
 * `selectedNodeId` = pièce du build sélectionnée.
 */
export type GameMode = 'hangar' | 'flight'

interface BuildState {
  aircraft: Aircraft
  mode: GameMode
  selectedPartId: string | null
  selectedNodeId: string | null
  /** Snapshot pour l'annulation (un seul pas). */
  past: Aircraft | null

  setMode: (mode: GameMode) => void
  setAircraft: (aircraft: Aircraft) => void
  selectPart: (partId: string | null) => void
  selectNode: (nodeId: string | null) => void
  /** Pose une pièce comme enfant de `parentId`, à `position`/`rotation` (repère du parent). */
  addPart: (
    parentId: string,
    partId: string,
    position: [number, number, number],
    rotation?: [number, number, number],
  ) => void
  /** Retire une pièce et tout son sous-arbre (jamais la racine). */
  removeNode: (nodeId: string) => void
  /** Annule la dernière édition (un seul pas). */
  undo: () => void
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `n${Math.random().toString(36).slice(2, 10)}`
}

export const useBuild = create<BuildState>((set) => ({
  aircraft: J1_AIRCRAFT,
  mode: 'hangar',
  selectedPartId: null,
  selectedNodeId: null,
  past: null,

  setMode: (mode) => set({ mode }),
  setAircraft: (aircraft) => set({ aircraft, past: null, selectedNodeId: null }),
  selectPart: (selectedPartId) => set({ selectedPartId, selectedNodeId: null }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  addPart: (parentId, partId, position, rotation = [0, 0, 0]) =>
    set((s) => {
      const node: PartNode = { nodeId: newId(), partId, parentId, position, rotation }
      return {
        past: structuredClone(s.aircraft),
        aircraft: { ...s.aircraft, nodes: [...s.aircraft.nodes, node] },
        selectedNodeId: node.nodeId,
        selectedPartId: null,
      }
    }),

  removeNode: (nodeId) =>
    set((s) => {
      if (nodeId === s.aircraft.rootId) return {}
      const dead = new Set([nodeId, ...descendantsOf(s.aircraft, nodeId).map((n) => n.nodeId)])
      return {
        past: structuredClone(s.aircraft),
        aircraft: { ...s.aircraft, nodes: s.aircraft.nodes.filter((n) => !dead.has(n.nodeId)) },
        selectedNodeId: null,
      }
    }),

  undo: () =>
    set((s) => (s.past ? { aircraft: s.past, past: null, selectedNodeId: null } : {})),
}))
