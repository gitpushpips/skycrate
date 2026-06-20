/**
 * Échelles et constantes globales liées aux pièces (dossier §6, §14).
 * Les conversions « valeur de fiche → valeur physique » passent TOUJOURS par ici.
 */

/** fuel ×100 : `fuel 1` = 100 unités de carburant. */
export const FUEL_SCALE = 100

/** strength ×100 : `strength 2,25` → rupture à 225 m/s. */
export const STRENGTH_SCALE = 100

/** Alerte structurelle affichée à 80 % de la vitesse de rupture (règle 5). */
export const STRUCTURAL_WARNING_RATIO = 0.8

/** Avion par défaut (dossier §14). */
export const BASE_FUEL = 1
export const BASE_ELECTRIC_CHARGE = 0.05

/** Carburant en unités réelles à partir de la valeur de fiche. */
export function fuelUnits(fuel: number): number {
  return fuel * FUEL_SCALE
}

/** Vitesse de rupture (m/s) d'une pièce à partir de sa `strength`. */
export function snapSpeedMs(strength: number): number {
  return strength * STRENGTH_SCALE
}

/** Vitesse d'alerte structurelle (m/s) = 80 % de la rupture. */
export function structuralWarningSpeedMs(strength: number): number {
  return snapSpeedMs(strength) * STRUCTURAL_WARNING_RATIO
}
