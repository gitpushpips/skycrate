import * as THREE from 'three'

/**
 * Convention de cap du monde (dossier §9, règle de fidélité visuelle §3).
 *
 * Le temps et le soleil sont FIGÉS. Le soleil est plein NORD et constitue le
 * SEUL repère de cap du jeu (pas de boussole). On fixe donc ici, une fois pour
 * toutes, la direction du nord et la position du soleil — toute la scène et,
 * plus tard, la navigation s'y réfèrent.
 *
 * Convention : NORD = -Z. Les ombres tombent donc toujours plein SUD (+Z),
 * ce qui en fait un repère d'orientation secondaire cohérent.
 */
export const NORTH = new THREE.Vector3(0, 0, -1)

/** Élévation du soleil au-dessus de l'horizon (degrés). */
export const SUN_ELEVATION_DEG = 48

/** Distance du soleil pour positionner la lumière directionnelle. */
export const SUN_DISTANCE = 80

const elevation = THREE.MathUtils.degToRad(SUN_ELEVATION_DEG)

/** Position de la lumière directionnelle : plein nord (-Z), en élévation. */
export const SUN_POSITION: readonly [number, number, number] = [
  0,
  Math.sin(elevation) * SUN_DISTANCE,
  -Math.cos(elevation) * SUN_DISTANCE,
]
