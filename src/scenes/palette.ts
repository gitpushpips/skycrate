/**
 * Palette low-poly ensoleillée — lisible et chaleureuse.
 * Centralisée ici pour garder une direction artistique cohérente.
 * (Réglable à chaud via leva pour les couleurs sensibles : voir Sky/Lights.)
 */
export const palette = {
  // Atmosphère
  skyTop: '#3a82c4',
  skyHorizon: '#d6ecf7',

  // Lumière
  sunLight: '#fff2d9',
  skyFill: '#bfe0ff',
  groundBounce: '#5c6b36',

  // Sol
  grass: '#86b14b',
  runway: '#9aa0a3',
  runwayLine: '#ece6d4',

  // Végétation
  treeTrunk: '#6b4a2f',
  treeFoliage: '#5e8f3e',
  treeFoliageAlt: '#74a84d',

  // Relief lointain
  hill: '#7aa345',

  // Avion (placeholder jusqu'à l'étape 3)
  plane: '#e8843f',
} as const
