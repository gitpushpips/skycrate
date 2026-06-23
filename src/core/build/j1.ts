import type { Aircraft } from './graph'

/**
 * L'avion de départ exprimé comme GRAPHE de pièces. Pièces à UN côté : l'aile et
 * le stabilisateur horizontal viennent en **paires miroir** (droite + gauche
 * `mirrored`), la dérive est unique sur l'axe. Sert d'avion de départ de l'éditeur
 * et de validation du pont compile (vol ≈ identique au J1 d'origine).
 *
 * Fuselage = racine à l'origine ⇒ positions relatives = positions avion.
 */
export const J1_AIRCRAFT: Aircraft = {
  id: 'plane.j1',
  name: 'Skycrate J1',
  rootId: 'fuselage',
  nodes: [
    { nodeId: 'fuselage', partId: 'fuselage.mk1', parentId: null, position: [0, 0, 0], rotation: [0, 0, 0] },

    // Ailes (paire miroir) — racine au centre, droite vers +X / gauche vers −X.
    { nodeId: 'wingR', partId: 'wing.mk1', parentId: 'fuselage', position: [0, -0.05, 0.15], rotation: [0, 0, 0], mirrorId: 'wingL' },
    { nodeId: 'wingL', partId: 'wing.mk1', parentId: 'fuselage', position: [0, -0.05, 0.15], rotation: [0, 0, 0], mirrorId: 'wingR', mirrored: true },

    // Stabilisateurs horizontaux (paire miroir) au niveau de la queue.
    { nodeId: 'stabR', partId: 'stabilizer.mk1', parentId: 'fuselage', position: [0, 0.18, 2.05], rotation: [0, 0, 0], mirrorId: 'stabL' },
    { nodeId: 'stabL', partId: 'stabilizer.mk1', parentId: 'fuselage', position: [0, 0.18, 2.05], rotation: [0, 0, 0], mirrorId: 'stabR', mirrored: true },

    // Dérive verticale (unique).
    { nodeId: 'fin', partId: 'fin.mk1', parentId: 'fuselage', position: [0, 0.3, 2.0], rotation: [0, 0, 0] },

    { nodeId: 'engine', partId: 'engine.wood', parentId: 'fuselage', position: [0, 0, -2.5], rotation: [0, 0, 0] },
    { nodeId: 'gear', partId: 'landingGear.mk1', parentId: 'fuselage', position: [0, 0, 0], rotation: [0, 0, 0] },
  ],
}
