import type {
  CockpitPart,
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

// Cockpits = racine obligatoire (S4). Nez + verrière, une allure par famille
// d'avion (silhouettes MAISON, aucun nom de marque). Chacun porte le carburant/
// charge de base (règle 6) et déclare le profil de sa face arrière (le fuselage
// l'épouse — S4-C). Valeurs de stats 🟡 calibrables.
const cockpitGa: CockpitPart = {
  id: 'cockpit.ga',
  name: 'Cockpit léger',
  category: 'cockpit',
  tier: 'T0',
  model: 'ga',
  section: { halfWidth: 0.42, halfHeight: 0.4, round: 0.55 }, // = station arrière du loft GA
  weight: 1.0, // 🟡 masse réaliste (structure avant) — cf. rééquilibrage inertie
  cost: 60, // 🟡
  researchCost: 0,
  fuel: BASE_FUEL, // ✅ avion de base = 1 (→ 100 u)
  electricCharge: BASE_ELECTRIC_CHARGE, // ✅ 0,05
  cargo: 0, // cargo au Jalon 5
  description: 'Aviation générale : cabine vitrée, pare-brise enveloppant. Le départ idéal.',
}

const cockpitGlider: CockpitPart = {
  id: 'cockpit.glider',
  name: 'Nez de planeur',
  category: 'cockpit',
  tier: 'T2',
  model: 'glider',
  section: { halfWidth: 0.11, halfHeight: 0.115, round: 1 }, // fine poutre de queue
  weight: 0.6, // 🟡 très léger
  cost: 90, // 🟡
  researchCost: 14, // 🟡
  fuel: BASE_FUEL,
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 0,
  description: 'Nez fin et fuselé, longue verrière basse d’un vol à voile. Traînée minimale.',
}

const cockpitWarbird: CockpitPart = {
  id: 'cockpit.warbird',
  name: 'Bulle de chasse à hélice',
  category: 'cockpit',
  tier: 'T3',
  model: 'warbird',
  section: { halfWidth: 0.33, halfHeight: 0.39, round: 0.8 },
  weight: 1.5, // 🟡 (blindage + capot moteur en ligne)
  cost: 150, // 🟡
  researchCost: 34, // 🟡
  fuel: BASE_FUEL,
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 0,
  description: 'Long capot moteur en ligne + verrière en goutte d’un chasseur d’époque.',
}

const cockpitAirliner: CockpitPart = {
  id: 'cockpit.airliner',
  name: 'Nez d’avion de ligne',
  category: 'cockpit',
  tier: 'T4',
  model: 'airliner',
  section: { halfWidth: 0.56, halfHeight: 0.57, round: 1 },
  weight: 2.6, // 🟡
  cost: 300, // 🟡
  researchCost: 70, // 🟡
  fuel: BASE_FUEL,
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 2, // 🟡 poste + soute avant
  description: 'Radôme arrondi + poste de pilotage à baies vitrées d’un jet de ligne.',
}

const cockpitWide: CockpitPart = {
  id: 'cockpit.wide',
  name: 'Nez de gros porteur',
  category: 'cockpit',
  tier: 'T2',
  model: 'wide',
  section: { halfWidth: 0.72, halfHeight: 0.68, round: 0.88 },
  weight: 3.2, // 🟡 gros
  cost: 200, // 🟡
  researchCost: 30, // 🟡
  fuel: 1.5, // 🟡 gros volume
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 4, // 🟡
  description: 'Nez bulbeux surdimensionné, poste surélevé « en bosse ». Énorme volume.',
}

const cockpitFighter: CockpitPart = {
  id: 'cockpit.fighter',
  name: 'Verrière de chasseur',
  category: 'cockpit',
  tier: 'T5',
  model: 'fighter',
  section: { halfWidth: 0.42, halfHeight: 0.42, round: 0.4 },
  weight: 1.8, // 🟡 (nez dense, avionique)
  cost: 380, // 🟡
  researchCost: 120, // 🟡
  fuel: BASE_FUEL,
  electricCharge: BASE_ELECTRIC_CHARGE,
  cargo: 0,
  description: 'Nez facetté furtif + bulle teintée or d’un chasseur moderne.',
}

// UN segment de fuselage déformable (S4-C) : il épouse la section du parent au
// raccord ; longueur/rayon de sortie/pointage se règlent par instance (inspecteur).
// Poids/fuel/cargo ∝ volume déformé (statScale). Remplace les 3 tailles fixes.
const fuselageSegment: FuselagePart = {
  id: 'fuselage.mk1',
  name: 'Segment de fuselage',
  category: 'fuselage',
  tier: 'T0',
  deformable: true,
  section: { halfWidth: 0.42, halfHeight: 0.44, round: 0.6 }, // défaut si rien à hériter
  baseLength: 1.6,
  weight: 3, // 🟡 (structure du fût, pour le volume par défaut ; ∝ volume ensuite)
  cost: 80, // 🟡
  researchCost: 0,
  fuel: 0.5, // 🟡 tankage du segment (∝ volume) — le carburant de BASE est au cockpit
  electricCharge: 0,
  cargo: 2, // 🟡 soute (∝ volume)
  description: 'Segment déformable : épouse la section du parent ; longueur, rayon de sortie et pointage réglables. Chaînable.',
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
  weight: 1.1, // 🟡 (demi-aile)
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
  weight: 1.3, // 🟡
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
  weight: 1.6, // 🟡
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
  weight: 2.3, // 🟡
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
  weight: 2.7, // 🟡
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
  weight: 0.45, // 🟡
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
  weight: 0.45, // 🟡
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
  weight: 2.4, // 🟡 (bloc moteur en tête = masse avant, réaliste)
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
  weight: 2.6, // 🟡
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
  weight: 3.8, // 🟡
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
  weight: 6.0, // 🟡
  cost: 380, // 🟡
  researchCost: 70, // 🟡
  thrust: 85, // 🟡 forte poussée mais T/W pilotable (~1.5 g sur cellule légère)
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
  weight: 5.4, // 🟡
  cost: 520, // 🟡
  researchCost: 130, // 🟡
  thrust: 90, // 🟡 à sec (~1.7 g sur cellule légère)
  fuelUsage: 6, // 🟡 à sec
  reversible: false,
  stackable: false,
  afterburner: { thrustMult: 1.6, fuelMult: 6 }, // 🟡 PC : pointe brève (~2.7 g), conso catastrophique
  description: 'Turboréacteur avec postcombustion (Espace) : poussée énorme, conso catastrophique.',
}

const rocketEngine: EnginePart = {
  id: 'engine.rocket',
  name: 'Moteur-fusée — Expérimental',
  category: 'engine',
  tier: 'T7',
  kind: 'rocket',
  weight: 3.2, // 🟡
  cost: 700, // 🟡
  researchCost: 220, // 🟡
  thrust: 150, // 🟡 poussée extrême (~3.3 g = le seul « délire » assumé)
  fuelUsage: 40, // 🟡 brûle très vite (durée courte)
  reversible: false,
  stackable: true,
  description: 'Fusée empilable : poussée extrême, combustion très courte. Pour le délire.',
}

const landingGearMk1: LandingGearPart = {
  id: 'landingGear.mk1',
  name: 'Train fixe — Léger',
  category: 'landingGear',
  tier: 'T0',
  weight: 0.7, // 🟡
  cost: 30, // 🟡
  researchCost: 0,
  strength: 1.0, // 🟡 seuil de collapse provisoire
  retractable: false,
  description: 'Train fixe, robuste court-terrain. Traîne (roues exposées). Pas de freins.',
}

const landingGearRetract: LandingGearPart = {
  id: 'landingGear.retract',
  name: 'Train rétractable',
  category: 'landingGear',
  tier: 'T3',
  weight: 1.3, // 🟡 plus lourd (mécanisme)
  cost: 110, // 🟡
  researchCost: 32, // 🟡
  strength: 1.2, // 🟡
  retractable: true,
  description: 'Se rentre en vol ⇒ traînée quasi nulle, mais plus lourd. (T3+)',
}

/** Toutes les pièces définies, dans l'ordre d'introduction. */
export const PARTS_LIST: readonly Part[] = [
  cockpitGa,
  cockpitGlider,
  cockpitWarbird,
  cockpitAirliner,
  cockpitWide,
  cockpitFighter,
  fuselageSegment,
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
  landingGearRetract,
]

/** Identifiants des pièces composant l'avion en dur du Jalon 1 (assemblé à l'étape 3). */
export const J1_PLANE_PART_IDS = [
  'fuselage.mk1',
  'wing.mk1',
  'stabilizer.mk1',
  'engine.wood',
  'landingGear.mk1',
] as const
