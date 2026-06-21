import { useControls, folder } from 'leva'

/**
 * Constantes de vol réglables à chaud (leva « Vol »). Modèle par surfaces
 * (étape 5b) : plus de coef de portance global ni de couples directs — la
 * portance/traînée viennent des surfaces. Hors dossier → calibrables.
 */
export interface FlightTunables {
  gravity: number
  // Aéro (AeroParams)
  airDensity: number
  inducedDrag: number
  flatPlateDrag: number
  // Poussée
  thrustCoef: number
  maxThrustLimit: number
  // Sol / amortissement
  groundFriction: number
  linearDamping: number
  angularDamping: number
  // Gouvernes
  maxDeflectionDeg: number
  servoRate: number
  // Caméra
  camDistance: number
  camHeight: number
}

export function useFlightTunables(): FlightTunables {
  const v = useControls('Vol', {
    gravité: folder({
      gravity: { value: 9.81, min: 0, max: 30, step: 0.01 },
    }),
    aéro: folder({
      airDensity: { value: 0.04, min: 0, max: 0.5, step: 0.001, label: 'densité air' },
      inducedDrag: { value: 0.05, min: 0, max: 0.5, step: 0.005, label: 'traînée induite' },
      flatPlateDrag: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'traînée plaque' },
    }),
    poussée: folder({
      thrustCoef: { value: 1.0, min: 0, max: 10, step: 0.1, label: 'coef poussée' },
      maxThrustLimit: { value: 1, min: 0, max: 1, step: 0.01, label: 'limite max' },
    }),
    sol: folder({
      groundFriction: { value: 0.08, min: 0, max: 1, step: 0.01, label: 'friction sol' },
    }),
    amortissement: folder({
      linearDamping: { value: 0, min: 0, max: 2, step: 0.01, label: 'amorti. linéaire' },
      angularDamping: { value: 0.1, min: 0, max: 3, step: 0.05, label: 'amorti. angulaire' },
    }),
    gouvernes: folder({
      maxDeflectionDeg: { value: 22, min: 5, max: 45, step: 1, label: 'déflexion max°' },
      servoRate: { value: 12, min: 2, max: 40, step: 1, label: 'vitesse servo' },
    }),
    caméra: folder({
      camDistance: { value: 11, min: 4, max: 30, step: 0.5, label: 'distance' },
      camHeight: { value: 3.5, min: 0, max: 15, step: 0.5, label: 'hauteur' },
    }),
  })

  return v as FlightTunables
}
