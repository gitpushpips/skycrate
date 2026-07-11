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
  /** Exposant portance vs vitesse au-delà de `liftRefSpeed` (2 = ½ρv² réel). */
  liftSpeedExponent: number
  /** Vitesse (m/s) sous laquelle la portance reste exactement en ½ρv². */
  liftRefSpeed: number
  inducedDrag: number
  flatPlateDrag: number
  bodyDrag: number
  cgShift: number
  // Poussée
  thrustCoef: number
  maxThrustLimit: number
  /** Vitesse de rampe des gaz au clavier (fraction de régime / seconde). */
  throttleRamp: number
  /** Cran de postcombustion : au-delà de cette fraction de jauge, la PC s'engage. */
  pcDetent: number
  // Sol / amortissement
  groundFriction: number
  /** « Peau » de contact des colliders de l'avion (m) — amortit l'accrochage
   *  des arêtes du terrain (S1). */
  contactSkin: number
  /** Rupture de train (S4-D, light) : vitesse verticale limite au toucher =
   *  min(strength des trains) × ce facteur (m/s). */
  gearBreakFactor: number
  // Ravitaillement (S5) — 🟡 hors dossier
  /** Débit de remplissage sur un pad d'aérodrome (unités de fuel / s). */
  refuelRate: number
  /** Vitesse max (m/s) sous laquelle le ravitaillement s'engage. */
  refuelMaxSpeed: number
  linearDamping: number
  angularDamping: number
  // Gouvernes
  maxDeflectionDeg: number
  servoRate: number
  /** Trim : déflexion PERMANENTE de l'élévateur (°) — règle la vitesse/assiette
   *  d'équilibre à commandes neutres (S3 : trim par position de gouverne). */
  elevatorTrim: number
  /** Part de tangage mélangée aux gouvernes d'aile (élevons) : 0 = ailerons purs. */
  wingElevon: number
  // Caméra
  camDistance: number
  camHeight: number
  // Assistance (auto-steer)
  assistEnabled: boolean
  pitchDamp: number
  rollDamp: number
  yawDamp: number
  holdGain: number
  levelReturn: number
  altHold: number
  limitGain: number
  antiStall: number
  stallGuardDeg: number
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
      // Portance tempérée (S-phys) : au-delà de `v réf.`, L ∝ v^n (2 = loi réelle).
      // Sans trim continu, la loi réelle fait « ballonner » tout excès de vitesse.
      liftSpeedExponent: { value: 1.5, min: 1, max: 2, step: 0.05, label: 'exposant portance' },
      liftRefSpeed: { value: 30, min: 10, max: 80, step: 1, label: 'v réf. portance' },
      inducedDrag: { value: 0.05, min: 0, max: 0.5, step: 0.005, label: 'traînée induite' },
      flatPlateDrag: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'traînée plaque' },
      bodyDrag: { value: 0.12, min: 0, max: 2, step: 0.02, label: 'traînée corps' },
      cgShift: { value: 0, min: -1.5, max: 1.5, step: 0.05, label: 'marge statique' },
    }),
    poussée: folder({
      thrustCoef: { value: 2.5, min: 0, max: 20, step: 0.1, label: 'coef poussée' },
      maxThrustLimit: { value: 1, min: 0, max: 1, step: 0.01, label: 'limite max' },
      throttleRamp: { value: 0.55, min: 0.1, max: 3, step: 0.05, label: 'rampe gaz (/s)' },
      pcDetent: { value: 0.85, min: 0.5, max: 0.95, step: 0.01, label: 'cran PC' },
    }),
    sol: folder({
      groundFriction: { value: 0.08, min: 0, max: 1, step: 0.01, label: 'friction sol' },
      contactSkin: { value: 0.02, min: 0, max: 0.15, step: 0.005, label: 'peau de contact' },
      gearBreakFactor: { value: 7, min: 2, max: 30, step: 0.5, label: 'rupture train (×robust.)' },
    }),
    ravitaillement: folder({
      refuelRate: { value: 40, min: 0, max: 120, step: 1, label: 'débit (u/s)' },
      refuelMaxSpeed: { value: 25, min: 0.5, max: 60, step: 0.5, label: 'v max (m/s)' },
    }),
    amortissement: folder({
      linearDamping: { value: 0, min: 0, max: 2, step: 0.01, label: 'amorti. linéaire' },
      angularDamping: { value: 0.1, min: 0, max: 3, step: 0.05, label: 'amorti. angulaire' },
    }),
    gouvernes: folder({
      maxDeflectionDeg: { value: 15, min: 5, max: 45, step: 1, label: 'déflexion max°' },
      servoRate: { value: 12, min: 2, max: 40, step: 1, label: 'vitesse servo' },
      wingElevon: { value: 0.6, min: 0, max: 1, step: 0.05, label: 'élevons (tangage aile)' },
      elevatorTrim: { value: 0, min: -10, max: 10, step: 0.25, label: 'trim élévateur°' },
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
      holdGain: { value: 150, min: 0, max: 400, step: 5, label: 'maintien attitude' },
      levelReturn: { value: 0, min: 0, max: 250, step: 1, label: 'ailes à plat (option)' },
      // Trim auto (artifice) DÉSACTIVÉ (défaut 0, demande utilisateur) : la portance
      // tempérée (liftSpeedExponent) amortit déjà la phugoïde toute seule ⇒ plus
      // besoin de maintien de palier. Réglage laissé en leva pour dépannage.
      altHold: { value: 0, min: 0, max: 60, step: 1, label: 'maintien palier (trim auto)' },
      limitGain: { value: 150, min: 0, max: 400, step: 5, label: 'fermeté bornes' },
      antiStall: { value: 8, min: 0, max: 40, step: 0.5, label: 'anti-décrochage' },
      stallGuardDeg: { value: 12, min: 5, max: 20, step: 0.5, label: 'seuil décroch.°' },
      maxPitchDeg: { value: 35, min: 10, max: 89, step: 1, label: 'tangage max°' },
      maxBankDeg: { value: 55, min: 10, max: 89, step: 1, label: 'bank max°' },
    }),
    visualisation: folder({
      showAirflow: { value: false, label: 'zones exposées' },
    }),
  })

  return v as FlightTunables
}
