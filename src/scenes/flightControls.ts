import { useControls, folder } from 'leva'

/**
 * Constantes physiques de vol réglables à chaud (leva « Vol »).
 * La plupart NE SONT PAS dans le dossier (§16) → exposées ici pour calibrer le
 * feel sans recompiler (anticipe l'étape 7).
 */
export interface FlightTunables {
  gravity: number
  liftCoef: number
  liftExponent: number
  maxAeroSpeed: number
  dragCoef: number
  thrustCoef: number
  maxThrustLimit: number
  groundFriction: number
  angularDamping: number
  linearDamping: number
}

export function useFlightTunables(): FlightTunables {
  const v = useControls('Vol', {
    gravité: folder({
      gravity: { value: 9.81, min: 0, max: 30, step: 0.01 },
    }),
    portance: folder({
      liftCoef: { value: 0.06, min: 0, max: 0.5, step: 0.001, label: 'coef portance' },
      liftExponent: { value: 2, min: 1, max: 2.5, step: 0.05, label: 'exposant f(v)' },
      // Saturation calée pour que la portance max ≈ poids (≈ vol ~à plat au-delà du
      // décollage, et plané quand on ralentit moteur coupé). Réglable selon la masse.
      maxAeroSpeed: { value: 30, min: 20, max: 225, step: 1, label: 'sat. portance v' },
    }),
    traînée: folder({
      dragCoef: { value: 0.02, min: 0, max: 0.3, step: 0.001, label: 'coef traînée' },
    }),
    poussée: folder({
      thrustCoef: { value: 2, min: 0, max: 10, step: 0.1, label: 'coef poussée' },
      maxThrustLimit: { value: 1, min: 0, max: 1, step: 0.01, label: 'limite max' },
    }),
    // Friction de ROULEMENT (faible) : le collider glisse mais émule des roues.
    // Friction trop haute = freins déguisés (interdit, règle 3). Au sol on ralentit
    // par friction + traînée + inverse de poussée uniquement.
    sol: folder({
      groundFriction: { value: 0.08, min: 0, max: 1, step: 0.01, label: 'friction sol' },
    }),
    amortissement: folder({
      linearDamping: { value: 0, min: 0, max: 2, step: 0.01, label: 'amorti. linéaire' },
      angularDamping: { value: 0.8, min: 0, max: 5, step: 0.05, label: 'amorti. angulaire' },
    }),
  })

  return v as FlightTunables
}
