import type { AeroSurfaceDef, DragPanelDef } from '../physics/aerodynamics'

/**
 * Surfaces aérodynamiques du J1 (repère local, calées sur le visuel de Plane.tsx).
 * Aile coupée en deux demi-ailes pour le roulis (ailerons opposés). Stab + dérive
 * derrière le centre de masse → stabilité naturelle en tangage et lacet.
 */
export const J1_AERO_SURFACES: AeroSurfaceDef[] = [
  {
    name: 'wingL',
    position: [-1.8, -0.05, 0.15],
    chord: [0, 0, -1],
    normal: [0, 1, 0],
    area: 5.4,
    liftSlope: 5.0,
    stallAngle: 0.27, // ~15.5°
    zeroLiftDrag: 0.012,
    incidence: 0.05, // léger calage positif → portance en palier
    controlKey: 'aileronL',
    controlEffectiveness: 0.4,
  },
  {
    name: 'wingR',
    position: [1.8, -0.05, 0.15],
    chord: [0, 0, -1],
    normal: [0, 1, 0],
    area: 5.4,
    liftSlope: 5.0,
    stallAngle: 0.27,
    zeroLiftDrag: 0.012,
    incidence: 0.05,
    controlKey: 'aileronR',
    controlEffectiveness: 0.4,
  },
  {
    name: 'hstab',
    position: [0, 0.18, 2.05],
    chord: [0, 0, -1],
    normal: [0, 1, 0],
    area: 2.4,
    liftSlope: 4.5,
    stallAngle: 0.3,
    zeroLiftDrag: 0.01,
    controlKey: 'elevator',
    controlEffectiveness: 0.5,
  },
  {
    name: 'vfin',
    position: [0, 0.73, 2.17],
    chord: [0, 0, -1],
    normal: [1, 0, 0], // portance latérale
    area: 0.95,
    liftSlope: 4.0,
    stallAngle: 0.35,
    zeroLiftDrag: 0.01,
    controlKey: 'rudder',
    controlEffectiveness: 0.5,
  },
]

/**
 * Panneaux de traînée de pression du J1 (faces du corps, sans portance). Donnent
 * une traînée dépendante de la GÉOMÉTRIE : frontal en vol normal, énorme au travers
 * (vrille, dérapage). Calés sur le fuselage (≈0,9×0,95×4,0) et le disque moteur.
 */
export const J1_DRAG_PANELS: DragPanelDef[] = [
  { name: 'engineFront', position: [0, 0, -2.95], normal: [0, 0, -1], area: 0.79 },
  { name: 'tail', position: [0, 0.05, 2.0], normal: [0, 0, 1], area: 0.6 },
  { name: 'top', position: [0, 0.48, 0], normal: [0, 1, 0], area: 3.6 },
  { name: 'bottom', position: [0, -0.48, 0], normal: [0, -1, 0], area: 3.6 },
  { name: 'left', position: [-0.45, 0, 0], normal: [-1, 0, 0], area: 3.8 },
  { name: 'right', position: [0.45, 0, 0], normal: [1, 0, 0], area: 3.8 },
]
