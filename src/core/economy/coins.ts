/**
 * Coins — la monnaie de CONSTRUCTION (dossier §, règle 7). Ce n'est PAS une
 * consommation : c'est un **plafond** sur la taille/complexité de l'avion. Chaque
 * pièce posée immobilise son `cost` en coins ; le retrait **rembourse**
 * intégralement. (Le scrap = monnaie de recherche, viendra avec le Jalon recherche.)
 *
 * Budget de départ : le dossier dit « petit budget » sans chiffre → valeur
 * provisoire exposée dans leva (« Économie »), pas devinée en dur dans la logique.
 */

/** Budget de coins de départ (🟡 hors dossier — calibrable dans leva). */
export const DEFAULT_COINS_BUDGET = 500

/** Coins encore disponibles = budget − coût immobilisé dans le build. */
export function coinsAvailable(budget: number, spent: number): number {
  return budget - spent
}

/** Une pièce de coût `cost` est posable si elle tient dans le budget restant. */
export function canAfford(cost: number, available: number): boolean {
  return cost <= available
}
