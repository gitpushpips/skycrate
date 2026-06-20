import type { PlaneAssembly } from './types'

/**
 * Avion « en dur » du Jalon 1 : fuselage + aile + stabilisateur + moteur + train.
 * Positions dans le repère local (nez = -Z). Calibrées pour le rendu de l'étape 3 ;
 * la physique (collider, forces) viendra à l'étape 4.
 */
export const J1_PLANE: PlaneAssembly = {
  id: 'plane.j1',
  name: 'Skycrate J1',
  parts: [
    { partId: 'fuselage.mk1', position: [0, 0, 0] },
    { partId: 'wing.mk1', position: [0, -0.05, 0.15] },
    { partId: 'stabilizer.mk1', position: [0, 0.18, 2.05] },
    { partId: 'engine.wood', position: [0, 0, -2.5] },
    { partId: 'landingGear.mk1', position: [0, 0, 0] },
  ],
}
