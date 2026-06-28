import { getPart, fuelUnits, snapSpeedMs, structuralWarningSpeedMs } from '../parts'
import type { EnginePart } from '../parts'
import type { PlaneAssembly } from './types'

/**
 * Stats agrégées d'un avion assemblé — base de la physique de vol (étape 4).
 * Tout dérive du catalogue : aucune valeur en dur ici.
 */
export interface AssemblyStats {
  /** Σ des masses des pièces. */
  totalWeight: number
  /** Carburant total en unités réelles (fuel ×100). */
  totalFuelUnits: number
  /** Volume de cargo total (fuselage + cockpits). */
  totalCargo: number
  /** Coût total en coins (Σ `cost`) = budget immobilisé dans le build (remboursé au retrait). */
  totalCost: number
  /** Charge électrique totale. */
  electricCharge: number
  /** Σ portance forfaitaire (ailes + stabilisateurs). */
  totalLift: number
  /** Σ traînée forfaitaire. */
  totalDrag: number
  /** Poussée max cumulée (tous moteurs à fond). */
  totalThrust: number
  /** Moteurs présents (états plein/off/inverse, conso…). */
  engines: EnginePart[]
  /** `strength` la plus faible parmi les surfaces (l'aile la plus fragile casse en 1re). */
  minStrength: number
  /** Vitesse de rupture (m/s) = minStrength ×100 (Infinity si aucune surface). */
  snapSpeedMs: number
  /** Vitesse d'alerte structurelle (m/s) = 80 % de la rupture. */
  warningSpeedMs: number
}

export function aggregateStats(assembly: PlaneAssembly): AssemblyStats {
  let totalWeight = 0
  let totalFuel = 0
  let electricCharge = 0
  let totalLift = 0
  let totalDrag = 0
  let totalThrust = 0
  let totalCargo = 0
  let totalCost = 0
  let minStrength = Infinity
  const engines: EnginePart[] = []

  for (const placed of assembly.parts) {
    const part = getPart(placed.partId)
    totalWeight += part.weight
    totalCost += part.cost

    switch (part.category) {
      case 'fuselage':
        totalFuel += part.fuel
        electricCharge += part.electricCharge
        totalCargo += part.cargo
        break
      case 'cabin':
        totalCargo += part.cargo
        break
      case 'wing':
        totalLift += part.lift
        totalDrag += part.drag
        minStrength = Math.min(minStrength, part.strength)
        if (part.fuel) totalFuel += part.fuel
        break
      case 'stabilizer':
        totalLift += part.lift
        totalDrag += part.drag
        minStrength = Math.min(minStrength, part.strength)
        break
      case 'engine':
        engines.push(part)
        totalThrust += part.thrust
        break
      case 'landingGear':
        break
    }
  }

  const hasSurface = Number.isFinite(minStrength)
  return {
    totalWeight,
    totalFuelUnits: fuelUnits(totalFuel),
    totalCargo,
    totalCost,
    electricCharge,
    totalLift,
    totalDrag,
    totalThrust,
    engines,
    minStrength,
    snapSpeedMs: hasSurface ? snapSpeedMs(minStrength) : Infinity,
    warningSpeedMs: hasSurface ? structuralWarningSpeedMs(minStrength) : Infinity,
  }
}
