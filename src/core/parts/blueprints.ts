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
  /** Collider SPHÉRIQUE (rayon = half[0], half = [r,r,r] pour l'éditeur) —
   *  roues : une sphère roule sur les arêtes des triangles du terrain là où
   *  un coin de boîte accroche (S1). */
  ball?: boolean
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

  // Fuselage moyen (GA) : un peu plus gros que le Caisson.
  'fuselage.medium': {
    mounts: [
      { position: [0, 0, -2.4], normal: [0, 0, -1] },
      { position: [0, -0.05, 0.1], normal: [0, 1, 0] },
      { position: [0, 0.25, 2.2], normal: [0, 1, 0] },
      { position: [0, 0, 0], normal: [0, -1, 0] },
      { position: [0, 0.58, -0.5], normal: [0, 1, 0] },
      { position: [0, 0.58, 0.9], normal: [0, 1, 0] },
    ],
    colliders: [{ half: [0.55, 0.56, 2.3] }],
    dragPanels: [
      { position: [0, 0.06, 2.3], normal: [0, 0, 1], area: 0.9 },
      { position: [0, 0.57, 0], normal: [0, 1, 0], area: 5.0 },
      { position: [0, -0.57, 0], normal: [0, -1, 0], area: 5.0 },
      { position: [-0.55, 0, 0], normal: [-1, 0, 0], area: 5.2 },
      { position: [0.55, 0, 0], normal: [1, 0, 0], area: 5.2 },
    ],
  },

  // Gros fuselage utilitaire : large et long (énorme volume).
  'fuselage.large': {
    mounts: [
      { position: [0, 0, -2.7], normal: [0, 0, -1] },
      { position: [0, -0.1, 0], normal: [0, 1, 0] },
      { position: [0, 0.3, 2.5], normal: [0, 1, 0] },
      { position: [0, -0.1, 0], normal: [0, -1, 0] },
      { position: [0, 0.78, -0.6], normal: [0, 1, 0] },
      { position: [0, 0.78, 1.0], normal: [0, 1, 0] },
    ],
    colliders: [{ half: [0.78, 0.72, 2.6] }],
    dragPanels: [
      { position: [0, 0.08, 2.6], normal: [0, 0, 1], area: 1.7 },
      { position: [0, 0.72, 0], normal: [0, 1, 0], area: 8.0 },
      { position: [0, -0.72, 0], normal: [0, -1, 0], area: 8.0 },
      { position: [-0.78, 0, 0], normal: [-1, 0, 0], area: 7.5 },
      { position: [0.78, 0, 0], normal: [1, 0, 0], area: 7.5 },
    ],
  },

  // Cockpit vitré : petit module sur le dessus.
  'cabin.cockpit': {
    mounts: [{ position: [0, -0.35, 0], normal: [0, -1, 0] }],
    colliders: [{ half: [0.4, 0.34, 0.72], offset: [0, 0, 0] }],
    dragPanels: [{ position: [0, 0.36, 0], normal: [0, 1, 0], area: 1.1 }],
  },

  // Soute cargo : boîte trapue (gros volume).
  'cabin.cargo': {
    mounts: [{ position: [0, -0.5, 0], normal: [0, -1, 0] }],
    colliders: [{ half: [0.55, 0.5, 1.0] }],
    dragPanels: [
      { position: [0, 0.5, 0], normal: [0, 1, 0], area: 2.0 },
      { position: [0.55, 0, 0], normal: [1, 0, 0], area: 1.9 },
      { position: [-0.55, 0, 0], normal: [-1, 0, 0], area: 1.9 },
    ],
  },

  // Cabine passagers : tube long à hublots.
  'cabin.passenger': {
    mounts: [{ position: [0, -0.55, 0], normal: [0, -1, 0] }],
    colliders: [{ half: [0.56, 0.56, 1.5] }],
    dragPanels: [
      { position: [0, 0.56, 0], normal: [0, 1, 0], area: 3.2 },
      { position: [0.56, 0, 0], normal: [1, 0, 0], area: 3.3 },
      { position: [-0.56, 0, 0], normal: [-1, 0, 0], area: 3.3 },
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

  // Demi-aile effilée (T1) : un peu plus d'envergure, traînée plus basse, robuste.
  'wing.tapered': {
    handed: true,
    mounts: [
      { position: [3.6, 0, 0], normal: [1, 0, 0] },
      { position: [1.8, 0.1, 0], normal: [0, 1, 0] },
      { position: [1.8, -0.06, 0], normal: [0, -1, 0] },
    ],
    colliders: [{ half: [1.8, 0.075, 0.7], offset: [1.8, 0, 0] }],
    surfaces: [
      {
        center: [1.8, 0, 0],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 3.6,
        area: 5.0,
        liftSlope: 5.0,
        stallAngle: 0.28,
        zeroLiftDrag: 0.01,
        incidence: 0.03,
        control: 'roll',
        controlEffectiveness: 0.5,
        stripsPerSide: 4,
        controlFraction: 0.5,
      },
    ],
  },

  // Demi-aile laminaire (T3) : profil fin, excellent L/D, snap haut.
  'wing.laminar': {
    handed: true,
    mounts: [
      { position: [3.8, 0, 0], normal: [1, 0, 0] },
      { position: [1.9, 0.09, 0], normal: [0, 1, 0] },
      { position: [1.9, -0.05, 0], normal: [0, -1, 0] },
    ],
    colliders: [{ half: [1.9, 0.07, 0.68], offset: [1.9, 0, 0] }],
    surfaces: [
      {
        center: [1.9, 0, 0],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 3.8,
        area: 5.2,
        liftSlope: 5.2,
        stallAngle: 0.26,
        zeroLiftDrag: 0.008,
        incidence: 0.025,
        control: 'roll',
        controlEffectiveness: 0.5,
        stripsPerSide: 4,
        controlFraction: 0.5,
      },
    ],
  },

  // Demi-aile en flèche (T4) : grande envergure, pente de portance réduite
  // (décolle vite), traînée très basse à haute vitesse.
  'wing.swept': {
    handed: true,
    mounts: [
      { position: [4.5, 0, 0.6], normal: [1, 0, 0] },
      { position: [2.25, 0.09, 0.3], normal: [0, 1, 0] },
      { position: [2.25, -0.05, 0.3], normal: [0, -1, 0] },
    ],
    colliders: [{ half: [2.25, 0.07, 0.95], offset: [2.25, 0, 0.35] }],
    surfaces: [
      {
        center: [2.25, 0, 0.2],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 4.5,
        area: 5.5,
        liftSlope: 4.0,
        stallAngle: 0.3,
        zeroLiftDrag: 0.006,
        incidence: 0.02,
        control: 'roll',
        controlEffectiveness: 0.45,
        stripsPerSide: 4,
        controlFraction: 0.5,
      },
    ],
  },

  // Demi-aile delta (T5) : grande corde, faible portance basse vitesse, décrochage
  // tardif (vol à forte incidence), traînée minimale, snap extrême.
  'wing.delta': {
    handed: true,
    mounts: [
      { position: [3.5, 0, 0.9], normal: [1, 0, 0] },
      { position: [1.5, 0.09, 0], normal: [0, 1, 0] },
      { position: [1.5, -0.05, 0], normal: [0, -1, 0] },
    ],
    colliders: [{ half: [1.75, 0.07, 1.3], offset: [1.75, 0, 0.2] }],
    surfaces: [
      {
        center: [1.75, 0, 0.1],
        chord: [0, 0, -1],
        normal: [0, 1, 0],
        spanAxis: [1, 0, 0],
        span: 3.5,
        area: 6.0,
        liftSlope: 3.5,
        stallAngle: 0.45,
        zeroLiftDrag: 0.005,
        incidence: 0.0,
        control: 'roll',
        controlEffectiveness: 0.45,
        stripsPerSide: 4,
        controlFraction: 0.45,
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

  'engine.piston': {
    colliders: [{ half: [0.46, 0.46, 0.45] }],
    engine: { thrustDir: [0, 0, -1], point: [0, 0, 0] },
    dragPanels: [{ position: [0, 0, -0.5], normal: [0, 0, -1], area: 0.66 }],
  },

  'engine.turboprop': {
    colliders: [{ half: [0.42, 0.42, 0.7] }],
    engine: { thrustDir: [0, 0, -1], point: [0, 0, 0.2] },
    dragPanels: [{ position: [0, 0, -0.75], normal: [0, 0, -1], area: 0.55 }],
  },

  'engine.turbofan': {
    colliders: [{ half: [0.55, 0.55, 0.85] }],
    engine: { thrustDir: [0, 0, -1], point: [0, 0, 0.3] },
    dragPanels: [{ position: [0, 0, -0.9], normal: [0, 0, -1], area: 0.95 }],
  },

  'engine.afterburner': {
    colliders: [{ half: [0.45, 0.45, 1.0] }],
    engine: { thrustDir: [0, 0, -1], point: [0, 0, 0.4] },
    dragPanels: [{ position: [0, 0, -1.05], normal: [0, 0, -1], area: 0.64 }],
  },

  'engine.rocket': {
    colliders: [{ half: [0.4, 0.4, 0.9] }],
    engine: { thrustDir: [0, 0, -1], point: [0, 0, 0.5] },
    dragPanels: [{ position: [0, 0, -0.95], normal: [0, 0, -1], area: 0.5 }],
  },

  // Train : colliders = les ROUES (sphères alignées sur le visuel : 2 principales
  // + roulette arrière) + une boîte de structure (jambes, sélection éditeur).
  // S1 : la boîte plate d'origine « cognait » les arêtes du terrain de ses coins.
  'landingGear.mk1': {
    colliders: [
      { half: [0.34, 0.34, 0.34], offset: [1.05, -0.95, -0.3], ball: true },
      { half: [0.34, 0.34, 0.34], offset: [-1.05, -0.95, -0.3], ball: true },
      { half: [0.2, 0.2, 0.2], offset: [0, -1.09, 2.0], ball: true },
      { half: [1.1, 0.22, 1.25], offset: [0, -0.68, 0.55] },
    ],
    // Roues/jambes exposées : un peu de traînée (face au vent + dessous).
    dragPanels: [{ position: [0, -1.0, -0.3], normal: [0, 0, -1], area: 0.5 }],
  },

  // Train rétractable : même empreinte au sol, mais escamotable ⇒ pas de panneau
  // de traînée permanent (rentré en vol par le visuel + faible traînée).
  'landingGear.retract': {
    colliders: [
      { half: [0.34, 0.34, 0.34], offset: [1.05, -0.95, -0.3], ball: true },
      { half: [0.34, 0.34, 0.34], offset: [-1.05, -0.95, -0.3], ball: true },
      { half: [0.2, 0.2, 0.2], offset: [0, -1.09, 2.0], ball: true },
      { half: [1.1, 0.22, 1.25], offset: [0, -0.68, 0.55] },
    ],
  },
}

export function getBlueprint(partId: string): PartBlueprint {
  const bp = BLUEPRINTS[partId]
  if (!bp) throw new Error(`Blueprint manquant pour la pièce: ${partId}`)
  return bp
}
