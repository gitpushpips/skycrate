import type { Aircraft } from './graph'

/**
 * L'avion du Jalon 1 exprimé comme GRAPHE de pièces (au lieu d'un assemblage en
 * dur). Sert de validation au pont 2-A : `compileAircraft(J1_AIRCRAFT)` doit
 * reproduire l'avion qui volait — et servira d'avion de départ dans l'éditeur.
 *
 * Fuselage = racine ; les autres pièces y sont attachées (positions relatives au
 * fuselage, qui est à l'origine ⇒ = positions avion).
 */
export const J1_AIRCRAFT: Aircraft = {
  id: 'plane.j1',
  name: 'Skycrate J1',
  rootId: 'fuselage',
  nodes: [
    { nodeId: 'fuselage', partId: 'fuselage.mk1', parentId: null, position: [0, 0, 0], rotation: [0, 0, 0] },
    { nodeId: 'wing', partId: 'wing.mk1', parentId: 'fuselage', position: [0, -0.05, 0.15], rotation: [0, 0, 0] },
    { nodeId: 'stab', partId: 'stabilizer.mk1', parentId: 'fuselage', position: [0, 0.18, 2.05], rotation: [0, 0, 0] },
    { nodeId: 'engine', partId: 'engine.wood', parentId: 'fuselage', position: [0, 0, -2.5], rotation: [0, 0, 0] },
    { nodeId: 'gear', partId: 'landingGear.mk1', parentId: 'fuselage', position: [0, 0, 0], rotation: [0, 0, 0] },
  ],
}
