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
  bodyDrag: number
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
  // Assistance (auto-steer)
  assistEnabled: boolean
  pitchDamp: number
  rollDamp: number
  yawDamp: number
  levelReturn: number
  altHold: number
  limitGain: number
  maxPitchDeg: number
  maxBankDeg: number
  // Visualisation
  showAirflow: boolean
}

export function useFlightTunables(): FlightTunables {
  const v = useControls('Vol', {
    gravité: folder({
      gravity: { value: 9.81, min: 0, max: 30, step: 0.01 },
    }),
    aéro: folder({
      airDensity: { value: 0.055, min: 0, max: 0.5, step: 0.001, label: 'densité air' },
      inducedDrag: { value: 0.05, min: 0, max: 0.5, step: 0.005, label: 'traînée induite' },
      flatPlateDrag: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'traînée plaque' },
      bodyDrag: { value: 0.12, min: 0, max: 2, step: 0.02, label: 'traînée corps' },
    }),
    poussée: folder({
      thrustCoef: { value: 2.5, min: 0, max: 20, step: 0.1, label: 'coef poussée' },
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
      maxDeflectionDeg: { value: 15, min: 5, max: 45, step: 1, label: 'déflexion max°' },
      servoRate: { value: 12, min: 2, max: 40, step: 1, label: 'vitesse servo' },
    }),
    caméra: folder({
      camDistance: { value: 11, min: 4, max: 30, step: 0.5, label: 'distance' },
      camHeight: { value: 3.5, min: 0, max: 15, step: 0.5, label: 'hauteur' },
    }),
    assistance: folder({
      assistEnabled: { value: true, label: 'auto-steer' },
      pitchDamp: { value: 30, min: 0, max: 120, step: 1, label: 'amorti tangage' },
      rollDamp: { value: 70, min: 0, max: 200, step: 1, label: 'amorti roulis' },
      yawDamp: { value: 40, min: 0, max: 120, step: 1, label: 'amorti lacet' },
      levelReturn: { value: 0, min: 0, max: 250, step: 1, label: 'ailes à plat (0=garde)' },
      altHold: { value: 0, min: 0, max: 60, step: 1, label: 'maintien alt. (0=garde)' },
      limitGain: { value: 150, min: 0, max: 400, step: 5, label: 'fermeté bornes' },
      maxPitchDeg: { value: 35, min: 10, max: 89, step: 1, label: 'tangage max°' },
      maxBankDeg: { value: 55, min: 10, max: 89, step: 1, label: 'bank max°' },
    }),
    visualisation: folder({
      showAirflow: { value: false, label: 'zones exposées' },
    }),
  })

  return v as FlightTunables
}
