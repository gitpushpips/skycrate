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
  /** Nombre de bandes le long de l'envergure. */
  stripsPerSide?: number
  /** Fraction extérieure (côté bout) qui porte la gouverne (1 = toute la surface). */
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
  /** Pièce à UN côté (aile, demi-stab) ⇒ le mode miroir crée TOUJOURS un jumeau
   *  reflété, même posée sur l'axe. Les pièces symétriques ne se mirrorent que hors-axe. */
  handed?: boolean
}

/** La pièce est-elle « à un côté » (mirror systématique) ? */
export function isHanded(partId: string): boolean {
  return BLUEPRINTS[partId]?.handed === true
}

export const BLUEPRINTS: Record<string, PartBlueprint> = {
  'fuselage.mk1': {
    // Points d'accroche le long du fuselage (repère pièce). Centrés (les pièces
    // du set sont symétriques) ⇒ une pièce posée s'aligne naturellement.
    mounts: [
      { position: [0, 0, -2.5], normal: [0, 0, -1] }, // nez (moteur)
      { position: [0, -0.05, 0.15], normal: [0, 1, 0] }, // milieu (aile)
      { position: [0, 0.18, 2.05], normal: [0, 1, 0] }, // queue (empennage)
      { position: [0, 0, 0], normal: [0, -1, 0] }, // ventre (train)
      { position: [0, 0.5, -0.6], normal: [0, 1, 0] }, // dessus avant
      { position: [0, 0.5, 0.8], normal: [0, 1, 0] }, // dessus arrière
    ],
    colliders: [{ half: [0.45, 0.475, 2.0] }],
    dragPanels: [
      { position: [0, 0.05, 2.0], normal: [0, 0, 1], area: 0.6 }, // arrière
      { position: [0, 0.48, 0], normal: [0, 1, 0], area: 3.6 }, // dessus
      { position: [0, -0.48, 0], normal: [0, -1, 0], area: 3.6 }, // dessous
      { position: [-0.45, 0, 0], normal: [-1, 0, 0], area: 3.8 }, // gauche
      { position: [0.45, 0, 0], normal: [1, 0, 0], area: 3.8 }, // droite
    ],
  },

  // Demi-aile : racine en x=0, s'étend vers +X (le miroir reflète vers −X).
  'wing.mk1': {
    handed: true,
    mounts: [
      { position: [3.4, 0, 0], normal: [1, 0, 0] }, // bout d'aile
      { position: [1.7, 0.1, 0], normal: [0, 1, 0] }, // dessus
      { position: [1.7, -0.06, 0], normal: [0, -1, 0] }, // dessous (moteur/strut)
    ],
    colliders: [{ half: [1.7, 0.08, 0.75], offset: [1.7, 0, 0] }],
    surfaces: [
      {
        center: [1.7, 0, 0],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 3.4,
        area: 5.4,
        liftSlope: 5.0,
        stallAngle: 0.27,
        zeroLiftDrag: 0.012,
        incidence: 0.035,
        control: 'roll',
        controlEffectiveness: 0.5,
        stripsPerSide: 4,
        controlFraction: 0.5,
      },
    ],
  },

  // Demi-stabilisateur horizontal (gouverne de profondeur) : racine x=0 → +X.
  'stabilizer.mk1': {
    handed: true,
    mounts: [{ position: [1.4, 0, 0], normal: [1, 0, 0] }],
    colliders: [{ half: [0.7, 0.065, 0.5], offset: [0.7, 0, 0] }],
    surfaces: [
      {
        center: [0.7, 0, 0],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 1.4,
        area: 1.2,
        liftSlope: 4.5,
        stallAngle: 0.3,
        zeroLiftDrag: 0.01,
        control: 'pitch',
        controlEffectiveness: 0.5,
        stripsPerSide: 2,
      },
    ],
  },

  // Dérive verticale (gouvernail / lacet) : racine y=0 → +Y.
  'fin.mk1': {
    mounts: [{ position: [0, 1.05, 0], normal: [0, 1, 0] }],
    colliders: [{ half: [0.08, 0.52, 0.3], offset: [0, 0.52, 0] }],
    surfaces: [
      {
        center: [0, 0.52, 0],
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
