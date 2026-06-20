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
  deformable: true,
  weight: 3, // 🟡
  cost: 100, // 🟡
  researchCost: 0,
  fuel: BASE_FUEL, // ✅ avion de base = 1 (→ 100 u)
  electricCharge: BASE_ELECTRIC_CHARGE, // ✅ 0,05
  cargo: 0, // le cargo viendra des cockpits (jalon ultérieur)
  description: 'Fuselage de base, déformable. Porte le carburant initial de l’avion.',
}

const wingMk1: WingPart = {
  id: 'wing.mk1',
  name: 'Aile portante Mk1',
  category: 'wing',
  weight: 1.5, // 🟡
  cost: 80, // 🟡
  researchCost: 0,
  lift: 1.0, // 🟡 valeur relative de référence
  drag: 0.12, // 🟡
  strength: 2.25, // ✅ exemple du dossier → rupture à 225 m/s
  description: 'Aile d’entrée de gamme. Portance/traînée forfaitaires.',
}

const stabilizerMk1: StabilizerPart = {
  id: 'stabilizer.mk1',
  name: 'Empennage Mk1',
  category: 'stabilizer',
  weight: 0.6, // 🟡
  cost: 40, // 🟡
  researchCost: 0,
  lift: 0.25, // 🟡
  drag: 0.05, // 🟡
  strength: 2.5, // 🟡 (→ 250 m/s)
  description: 'Stabilisateur arrière. Petite portance de contrôle.',
}

const woodEngine: EnginePart = {
  id: 'engine.wood',
  name: 'Moteur à bois',
  category: 'engine',
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
  stabilizerMk1,
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
