/**
 * Modèle de données des pièces (dossier §3, §4, §5, §15).
 *
 * Toutes les stats de jeu d'une pièce vivent ici, en TS typé — JAMAIS en dur
 * dans la logique de vol/éco. Union discriminée par `category` pour que chaque
 * catégorie n'expose que les stats qui la concernent (TS strict).
 *
 * Échelles (dossier §14, voir aussi scales.ts) :
 *   - `fuel`     ×100  (fuel 1 = 100 unités)
 *   - `strength` ×100  (strength 2,25 → rupture à 225 m/s)
 *
 * ⚠️ Beaucoup de valeurs chiffrées par pièce NE SONT PAS dans le dossier
 * (§16 : « à relever en jeu »). Elles sont ici **provisoires** et calibrables :
 *   - les coefficients GLOBAUX (portance, traînée, poussée…) seront dans leva (étape 7) ;
 *   - les valeurs RELATIVES par pièce se calibrent en éditant le catalogue.
 */

export type PartCategory = 'fuselage' | 'wing' | 'stabilizer' | 'engine' | 'landingGear'

/**
 * Palier de progression (réf. `docs/catalogue-pieces.md`) : T0 pionnier bois/toile
 * → T1 aviation générale → T2 utilitaire turboprop → T3 warbird → T4 jet de ligne
 * → T5 chasseur PC → T6 furtif → T7 expérimental/fusée. Calibré sur de vrais avions
 * (silhouettes maison, aucun nom de marque) ; servira à l'arbre de recherche.
 */
export type Tier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7'

/** Familles de moteurs (dossier §5 + extension catalogue) — définit le caractère. */
export type EngineKind =
  | 'wood'
  | 'propeller'
  | 'turboprop'
  | 'turbofan'
  | 'afterburner'
  | 'rocket'
  | 'electric'

/** États de poussée d'un moteur à l'exécution (dossier §5, règle 2). */
export type ThrustState = 'full' | 'off' | 'reverse'

interface BasePart {
  readonly id: string
  /** Notre nom maison — ne jamais réutiliser un nom de l'original. */
  readonly name: string
  readonly category: PartCategory
  /** Palier de progression (T0-T7). */
  readonly tier: Tier
  /** Masse (unités internes). Plus de masse ⇒ + de portance requise, accél. plus lente. */
  readonly weight: number
  /** Coins : budget de construction REMBOURSÉ au retrait (plafond, pas une conso — règle 7). */
  readonly cost: number
  /** Scrap : coût de recherche pour débloquer la pièce (0 = dispo d'emblée). */
  readonly researchCost: number
  readonly description?: string
}

/** Fuselage : seule pièce déformable (règle 8). Porte le carburant de base de l'avion. */
export interface FuselagePart extends BasePart {
  readonly category: 'fuselage'
  readonly deformable: true
  /** ×100. Avion de base = 1 (→ 100 u) (dossier §6, §14). */
  readonly fuel: number
  /** Charge électrique de base = 0,05 (dossier §6, §14). */
  readonly electricCharge: number
  /** Volume de cargo (les cockpits en ajoutent surtout — dossier §3 ; 0 pour le J1). */
  readonly cargo: number
}

/** Aile : portance/traînée forfaitaires (pas de Cl/Cd — règle 4) + rupture (règle 5). */
export interface WingPart extends BasePart {
  readonly category: 'wing'
  /** Portance forfaitaire (valeur relative ; × coef global × f(v)). */
  readonly lift: number
  /** Traînée forfaitaire (valeur relative ; × coef global × f(v)). */
  readonly drag: number
  /** ×100 → vitesse de rupture en m/s (alerte à 80 %, règle 5). */
  readonly strength: number
  /** ×100. Certaines ailes ajoutent du carburant (dossier §6). */
  readonly fuel?: number
}

/** Stabilisateur / tail wing : petite portance de contrôle + traînée + rupture. */
export interface StabilizerPart extends BasePart {
  readonly category: 'stabilizer'
  readonly lift: number
  readonly drag: number
  readonly strength: number
}

/** Moteur : poussée max + conso (règle 2). Limite de poussée réglable par instance (éditeur). */
export interface EnginePart extends BasePart {
  readonly category: 'engine'
  readonly kind: EngineKind
  /** Poussée maximale (force). La limite par instance se règle dans l'éditeur. */
  readonly thrust: number
  /** Carburant consommé par seconde à pleine poussée (dossier §5 : wood = 2/s). */
  readonly fuelUsage: number
  /** Peut produire une poussée inverse (config propulsive / freinage — règle 2/3). */
  readonly reversible: boolean
  /** Empilable en stack (ex. rockets — dossier §5). */
  readonly stackable: boolean
}

/** Train d'atterrissage : pas de freins (règle 3) ; seuil de collapse à l'impact. */
export interface LandingGearPart extends BasePart {
  readonly category: 'landingGear'
  /** Seuil de robustesse / collapse (provisoire — non issu du dossier). */
  readonly strength: number
}

export type Part =
  | FuselagePart
  | WingPart
  | StabilizerPart
  | EnginePart
  | LandingGearPart

/** Mappe une catégorie vers son type de pièce concret. */
export type PartOf<C extends PartCategory> = Extract<Part, { category: C }>
