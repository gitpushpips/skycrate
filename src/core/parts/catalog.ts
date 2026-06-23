import type {
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
  name: 'Caisson Mk1',
  category: 'fuselage',
  tier: 'T0',
  deformable: true,
  weight: 3, // 🟡
  cost: 100, // 🟡
  researchCost: 0,
  fuel: BASE_FUEL, // ✅ avion de base = 1 (→ 100 u)
  electricCharge: BASE_ELECTRIC_CHARGE, // ✅ 0,05
  cargo: 0, // le cargo viendra des cockpits (jalon ultérieur)
  description: 'Fuselage de base, déformable. Porte le carburant initial de l’avion.',
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
  wingMk1,
  wingTapered,
  wingLaminar,
  wingSwept,
  wingDelta,
  stabilizerMk1,
  finMk1,
  woodEngine,
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
