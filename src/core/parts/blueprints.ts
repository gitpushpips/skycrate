/**
 * Blueprints des pièces (Jalon 2-A) — tout ce dont la physique a besoin pour
 * GÉNÉRER dynamiquement un avion, en repère LOCAL de la pièce. La compilation
 * (`core/build/compile`) transforme ces données par la position d'attache.
 *
 * Reproduit à l'identique l'avion J1 (surfaces/panneaux/colliders qui étaient
 * codés en dur dans surfaces.ts / PlaneRig).
 */

type Vec3 = [number, number, number]

/** Boîte de collision (repère pièce). */
export interface BpCollider {
  half: Vec3
  offset?: Vec3
}

/** Surface portante, subdivisée en bandes d'envergure par le compilateur. */
export interface BpLiftingSurface {
  /** Centre (repère pièce). */
  center: Vec3
  /** Corde = avant de la surface (≈ (0,0,-1)). */
  chord: Vec3
  /** Normale = sens de portance au repos (+Y aile, +X dérive). */
  normal: Vec3
  /** Direction d'envergure (X pour une aile). */
  spanAxis: Vec3
  /** Envergure totale (m). */
  span: number
  /** Surface totale (m²). */
  area: number
  liftSlope: number
  stallAngle: number
  zeroLiftDrag: number
  incidence?: number
  /** Axe de commande : roll ⇒ ailerons gauche/droite opposés ; pitch/yaw ⇒ central. */
  control?: 'roll' | 'pitch' | 'yaw'
  controlEffectiveness?: number
  /** Bandes par demi-aile (roll) ou bandes centrales (pitch/yaw). */
  stripsPerSide?: number
  /** Écart de l'emplanture au centre (gap fuselage), pour le roll. */
  rootGap?: number
  /** Fraction extérieure qui porte la gouverne (roll). */
  controlFraction?: number
}

/** Panneau de traînée de pression (face de corps). */
export interface BpDragPanel {
  position: Vec3
  normal: Vec3
  area: number
}

/** Source de poussée. */
export interface BpEngine {
  /** Direction de poussée au repos (repère pièce), ≈ (0,0,-1). */
  thrustDir: Vec3
  /** Point d'application (repère pièce). */
  point: Vec3
}

/** Surface d'accroche pour le snapping (Jalon 2-C). */
export interface BpMount {
  position: Vec3
  normal: Vec3
  size?: [number, number]
}

export interface PartBlueprint {
  colliders: BpCollider[]
  surfaces?: BpLiftingSurface[]
  dragPanels?: BpDragPanel[]
  engine?: BpEngine
  mounts?: BpMount[]
}

export const BLUEPRINTS: Record<string, PartBlueprint> = {
  'fuselage.mk1': {
    colliders: [{ half: [0.45, 0.475, 2.0] }],
    dragPanels: [
      { position: [0, 0.05, 2.0], normal: [0, 0, 1], area: 0.6 }, // arrière
      { position: [0, 0.48, 0], normal: [0, 1, 0], area: 3.6 }, // dessus
      { position: [0, -0.48, 0], normal: [0, -1, 0], area: 3.6 }, // dessous
      { position: [-0.45, 0, 0], normal: [-1, 0, 0], area: 3.8 }, // gauche
      { position: [0.45, 0, 0], normal: [1, 0, 0], area: 3.8 }, // droite
    ],
  },

  'wing.mk1': {
    colliders: [{ half: [3.6, 0.08, 0.75] }],
    surfaces: [
      {
        center: [0, 0, 0],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 7.0,
        area: 10.8,
        liftSlope: 5.0,
        stallAngle: 0.27,
        zeroLiftDrag: 0.012,
        incidence: 0.035,
        control: 'roll',
        controlEffectiveness: 0.5,
        stripsPerSide: 4,
        rootGap: 0.45,
        controlFraction: 0.5,
      },
    ],
  },

  // Empennage combiné : plan horizontal (élévateur) + dérive (gouvernail).
  'stabilizer.mk1': {
    colliders: [{ half: [1.4, 0.065, 0.6], offset: [0, 0.18, 0.55] }],
    surfaces: [
      {
        center: [0, 0, 0],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 2.8,
        area: 2.4,
        liftSlope: 4.5,
        stallAngle: 0.3,
        zeroLiftDrag: 0.01,
        control: 'pitch',
        controlEffectiveness: 0.5,
        stripsPerSide: 1,
      },
      {
        center: [0, 0.55, 0.12],
        chord: [0, 0, -1],
        normal: [1, 0, 0],
        spanAxis: [0, 1, 0],
        span: 1.05,
        area: 0.95,
        liftSlope: 4.0,
        stallAngle: 0.35,
        zeroLiftDrag: 0.01,
        control: 'yaw',
        controlEffectiveness: 0.5,
        stripsPerSide: 1,
      },
    ],
  },

  'engine.wood': {
    colliders: [{ half: [0.5, 0.5, 0.4] }],
    engine: { thrustDir: [0, 0, -1], point: [0, 0, 0] },
    dragPanels: [{ position: [0, 0, -0.45], normal: [0, 0, -1], area: 0.79 }],
  },

  'landingGear.mk1': {
    colliders: [{ half: [1.0, 0.12, 1.4], offset: [0, -1.15, 0] }],
  },
}

export function getBlueprint(partId: string): PartBlueprint {
  const bp = BLUEPRINTS[partId]
  if (!bp) throw new Error(`Blueprint manquant pour la pièce: ${partId}`)
  return bp
}
