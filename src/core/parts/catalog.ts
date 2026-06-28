import type {
  CabinPart,
  EnginePart,
  FuselagePart,
  LandingGearPart,
  Part,
  StabilizerPart,
  WingPart,
} from './types'
import { BASE_ELECTRIC_CHARGE, BASE_FUEL } from './scales'

/**
 * Catalogue des pièces — démarrage Jalon 1 : de quoi assembler en dur l'avion
 * minimal (1 fuselage + 1 aile + 1 stabilisateur + 1 moteur + train).
 *
 * Confiance des valeurs :
 *   ✅ issues du dossier  →  moteur bois `fuelUsage = 2/s` ; fuselage `fuel 1` +
 *      `electricCharge 0,05` ; aile `strength 2,25` (= rupture 225 m/s, exemple §4).
 *   🟡 PROVISOIRE (non au dossier, §16) → toutes les masses, coûts, `lift`, `drag`,
 *      `thrust`, et la robustesse du train. À calibrer (coefs globaux dans leva à
 *      l'étape 7 ; valeurs relatives en éditant ce fichier).
 */

const fuselageMk1: FuselagePart = {
  id: 'fuselage.mk1',
  name: 'Caisson — Léger',
  category: 'fuselage',
  tier: 'T0',
  deformable: true,
  size: 'small',
  weight: 3, // 🟡
  cost: 100, // 🟡
  researchCost: 0,
  fuel: BASE_FUEL, // ✅ avion de base = 1 (→ 100 u)
  electricCharge: BASE_ELECTRIC_CHARGE, // ✅ 0,05
  cargo: 0, // le cargo vient des cabines
  description: 'Fuselage de base, léger. Porte le carburant initial de l’avion.',
}

// Fuselages plus gros = plus de carburant/volume mais plus lourds.
const fuselageMedium: FuselagePart = {
  id: 'fuselage.medium',
  name: 'Fuselage — Général',
  category: 'fuselage',
  tier: 'T1',
  deformable: true,
  size: 'medium',
  weight: 4.5, // 🟡
  cost: 150, // 🟡
  researchCost: 12, // 🟡
  fuel: 1.5, // 🟡 plus de tankage
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 3, // 🟡 petit volume
  description: 'Fuselage d’aviation générale : plus de carburant et un peu de volume.',
}

const fuselageLarge: FuselagePart = {
  id: 'fuselage.large',
  name: 'Fuselage — Gros porteur',
  category: 'fuselage',
  tier: 'T2',
  deformable: true,
  size: 'large',
  weight: 8, // 🟡
  cost: 280, // 🟡
  researchCost: 35, // 🟡
  fuel: 2.5, // 🟡
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 10, // 🟡 grosse soute
  description: 'Gros fuselage utilitaire : énorme volume et carburant, mais lourd.',
}

// Cabines = source de cargo (plusieurs autorisées). Volume croissant par palier.
const cabinCockpit: CabinPart = {
  id: 'cabin.cockpit',
  name: 'Cockpit vitré',
  category: 'cabin',
  tier: 'T1',
  kind: 'cockpit',
  weight: 0.4, // 🟡
  cost: 50, // 🟡
  researchCost: 6, // 🟡
  cargo: 2, // 🟡
  description: 'Verrière de pilotage. Un peu de volume utile.',
}

const cabinCargo: CabinPart = {
  id: 'cabin.cargo',
  name: 'Soute cargo',
  category: 'cabin',
  tier: 'T2',
  kind: 'cargo',
  weight: 1.2, // 🟡
  cost: 120, // 🟡
  researchCost: 22, // 🟡
  cargo: 10, // 🟡 cœur du transport
  description: 'Soute à fret : gros volume de cargo, porte latérale.',
}

const cabinPassenger: CabinPart = {
  id: 'cabin.passenger',
  name: 'Cabine passagers',
  category: 'cabin',
  tier: 'T4',
  kind: 'passenger',
  weight: 2.5, // 🟡
  cost: 260, // 🟡
  researchCost: 60, // 🟡
  cargo: 16, // 🟡 le plus gros volume
  description: 'Cabine pressurisée à hublots : volume maximal.',
}

// Ailes à UN seul côté (le mode Miroir crée la paire). Une planforme par palier :
// le caractère (portance basse vitesse, traînée, rupture) vient des stats + des
// surfaces du blueprint ; la silhouette se lit à l'écran. Valeurs 🟡 calibrables.
const wingMk1: WingPart = {
  id: 'wing.mk1',
  name: 'Aile droite — Pionnier',
  category: 'wing',
  tier: 'T0',
  planform: 'straight',
  weight: 0.8, // 🟡 (demi-aile)
  cost: 40, // 🟡
  researchCost: 0,
  lift: 0.5, // 🟡 demi-portance (la paire ≈ 1.0)
  drag: 0.06, // 🟡
  strength: 2.25, // ✅ exemple du dossier → rupture à 225 m/s
  description: 'Demi-aile droite épaisse : portance basse vitesse, fragile. Élevon.',
}

const wingTapered: WingPart = {
  id: 'wing.tapered',
  name: 'Aile effilée — Brousse',
  category: 'wing',
  tier: 'T1',
  planform: 'tapered',
  weight: 0.9, // 🟡
  cost: 70, // 🟡
  researchCost: 8, // 🟡
  lift: 0.55, // 🟡
  drag: 0.045, // 🟡
  strength: 3.0, // 🟡 → 300 m/s
  description: 'Demi-aile effilée métal : bon compromis portance/traînée, robuste.',
}

const wingLaminar: WingPart = {
  id: 'wing.laminar',
  name: 'Aile laminaire — Course',
  category: 'wing',
  tier: 'T3',
  planform: 'laminar',
  weight: 1.1, // 🟡
  cost: 160, // 🟡
  researchCost: 30, // 🟡
  lift: 0.6, // 🟡
  drag: 0.03, // 🟡 profil laminaire (réf. Cd₀ 0,0163)
  strength: 4.5, // 🟡 → 450 m/s
  description: 'Demi-aile laminaire haute perf. : excellent L/D, ailes solides.',
}

const wingSwept: WingPart = {
  id: 'wing.swept',
  name: 'Aile en flèche — Ligne',
  category: 'wing',
  tier: 'T4',
  planform: 'swept',
  weight: 1.6, // 🟡
  cost: 300, // 🟡
  researchCost: 60, // 🟡
  lift: 0.45, // 🟡 portance basse vitesse réduite (décollage rapide)
  drag: 0.022, // 🟡 faible traînée à haute vitesse
  strength: 6.0, // 🟡 → 600 m/s
  description: 'Demi-aile en flèche : faible traînée rapide, décolle vite, snap haut.',
}

const wingDelta: WingPart = {
  id: 'wing.delta',
  name: 'Aile delta — Chasse',
  category: 'wing',
  tier: 'T5',
  planform: 'delta',
  weight: 1.8, // 🟡
  cost: 420, // 🟡
  researchCost: 110, // 🟡
  lift: 0.4, // 🟡 faible portance basse vitesse
  drag: 0.018, // 🟡
  strength: 8.0, // 🟡 → 800 m/s
  description: 'Demi-aile delta : très haute vitesse, manœuvrable, snap extrême.',
}

// Empennage en pièces séparées : un stabilisateur horizontal par côté + une dérive.
const stabilizerMk1: StabilizerPart = {
  id: 'stabilizer.mk1',
  name: 'Stab. horizontal Mk1',
  category: 'stabilizer',
  tier: 'T0',
  weight: 0.3, // 🟡
  cost: 20, // 🟡
  researchCost: 0,
  lift: 0.12, // 🟡 (la paire ≈ 0.25)
  drag: 0.025, // 🟡
  strength: 2.5, // 🟡 (→ 250 m/s)
  description: 'Demi-stabilisateur horizontal (gouverne de profondeur).',
}

const finMk1: StabilizerPart = {
  id: 'fin.mk1',
  name: 'Dérive Mk1',
  category: 'stabilizer',
  tier: 'T0',
  weight: 0.3, // 🟡
  cost: 20, // 🟡
  researchCost: 0,
  lift: 0.0, // surface verticale : pas de portance verticale
  drag: 0.025, // 🟡
  strength: 2.5, // 🟡
  description: 'Dérive verticale (gouvernail / lacet).',
}

const woodEngine: EnginePart = {
  id: 'engine.wood',
  name: 'Moteur à bois',
  category: 'engine',
  tier: 'T0',
  kind: 'wood',
  weight: 1.2, // 🟡
  cost: 60, // 🟡
  researchCost: 0,
  thrust: 22, // 🟡 poussée max provisoire
  fuelUsage: 2, // ✅ dossier §5 : 2 u/s à pleine poussée
  reversible: true,
  stackable: false,
  description: 'Moteur bas de gamme, gourmand. Plein / arrêt / inverse.',
}

// Moteurs par type — le caractère vient du couple poussée/conso (réf. catalogue).
const pistonEngine: EnginePart = {
  id: 'engine.piston',
  name: 'Moteur à pistons — Léger',
  category: 'engine',
  tier: 'T1',
  kind: 'propeller',
  weight: 1.4, // 🟡
  cost: 90, // 🟡
  researchCost: 10, // 🟡
  thrust: 35, // 🟡
  fuelUsage: 1.5, // 🟡 efficace
  reversible: true,
  stackable: false,
  description: 'Piston à hélice : poussée modérée, sobre, vitesse de pointe plafonnée.',
}

const turbopropEngine: EnginePart = {
  id: 'engine.turboprop',
  name: 'Turbopropulseur — Brousse',
  category: 'engine',
  tier: 'T2',
  kind: 'turboprop',
  weight: 2.2, // 🟡
  cost: 180, // 🟡
  researchCost: 28, // 🟡
  thrust: 60, // 🟡 bonne poussée basse vitesse
  fuelUsage: 3, // 🟡 raisonnable
  reversible: true,
  stackable: false,
  description: 'Turboprop : puissance et poussée basse vitesse, court-terrain.',
}

const turbofanEngine: EnginePart = {
  id: 'engine.turbofan',
  name: 'Turbofan — Ligne',
  category: 'engine',
  tier: 'T4',
  kind: 'turbofan',
  weight: 4.0, // 🟡
  cost: 380, // 🟡
  researchCost: 70, // 🟡
  thrust: 110, // 🟡 forte poussée, efficace à haute vitesse
  fuelUsage: 5, // 🟡
  reversible: false,
  stackable: false,
  description: 'Turbofan : forte poussée, efficace en croisière, exige de la vitesse.',
}

const afterburnerEngine: EnginePart = {
  id: 'engine.afterburner',
  name: 'Turboréacteur PC — Chasse',
  category: 'engine',
  tier: 'T5',
  kind: 'afterburner',
  weight: 3.6, // 🟡
  cost: 520, // 🟡
  researchCost: 130, // 🟡
  thrust: 130, // 🟡 à sec
  fuelUsage: 6, // 🟡 à sec
  reversible: false,
  stackable: false,
  afterburner: { thrustMult: 2.2, fuelMult: 6 }, // 🟡 PC : poussée énorme, conso catastrophique
  description: 'Turboréacteur avec postcombustion (Espace) : poussée énorme, conso catastrophique.',
}

const rocketEngine: EnginePart = {
  id: 'engine.rocket',
  name: 'Moteur-fusée — Expérimental',
  category: 'engine',
  tier: 'T7',
  kind: 'rocket',
  weight: 2.0, // 🟡
  cost: 700, // 🟡
  researchCost: 220, // 🟡
  thrust: 300, // 🟡 poussée extrême
  fuelUsage: 40, // 🟡 brûle très vite (durée courte)
  reversible: false,
  stackable: true,
  description: 'Fusée empilable : poussée extrême, combustion très courte. Pour le délire.',
}

const landingGearMk1: LandingGearPart = {
  id: 'landingGear.mk1',
  name: 'Train fixe Mk1',
  category: 'landingGear',
  tier: 'T0',
  weight: 0.5, // 🟡
  cost: 30, // 🟡
  researchCost: 0,
  strength: 1.0, // 🟡 seuil de collapse provisoire
  description: 'Train d’atterrissage fixe. Pas de freins (règle 3).',
}

/** Toutes les pièces définies, dans l'ordre d'introduction. */
export const PARTS_LIST: readonly Part[] = [
  fuselageMk1,
  fuselageMedium,
  fuselageLarge,
  cabinCockpit,
  cabinCargo,
  cabinPassenger,
  wingMk1,
  wingTapered,
  wingLaminar,
  wingSwept,
  wingDelta,
  stabilizerMk1,
  finMk1,
  woodEngine,
  pistonEngine,
  turbopropEngine,
  turbofanEngine,
  afterburnerEngine,
  rocketEngine,
  landingGearMk1,
]

/** Identifiants des pièces composant l'avion en dur du Jalon 1 (assemblé à l'étape 3). */
export const J1_PLANE_PART_IDS = [
  'fuselage.mk1',
  'wing.mk1',
  'stabilizer.mk1',
  'engine.wood',
  'landingGear.mk1',
] as const
