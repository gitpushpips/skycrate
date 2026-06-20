/**
 * Point d'entrée du domaine « pièces ». Importer depuis `core/parts`, pas depuis
 * les fichiers internes.
 */
export * from './types'
export * from './scales'
export * from './catalog'

import type { Part, PartCategory, PartOf } from './types'
import { PARTS_LIST } from './catalog'

/** Index par id (gelé pour éviter toute mutation accidentelle des données). */
export const PARTS: Readonly<Record<string, Part>> = Object.freeze(
  Object.fromEntries(PARTS_LIST.map((part) => [part.id, part])),
)

/** Récupère une pièce par id (lève si inconnue — les ids sont des constantes du code). */
export function getPart(id: string): Part {
  const part = PARTS[id]
  if (!part) throw new Error(`Pièce inconnue: ${id}`)
  return part
}

/** Filtre typé par catégorie. */
export function getPartsByCategory<C extends PartCategory>(category: C): PartOf<C>[] {
  return PARTS_LIST.filter((part): part is PartOf<C> => part.category === category)
}
