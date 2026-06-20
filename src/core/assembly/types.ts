/**
 * Description d'un assemblage d'avion (dossier §3, §15).
 *
 * Un assemblage = une liste de pièces du catalogue, placées dans le repère LOCAL
 * de l'avion. Convention de repère avion :
 *   - nez / avant (sens de la poussée) = -Z
 *   - haut = +Y, aile droite = +X
 * (cohérent avec la piste orientée nord-sud et le soleil = nord ; règle 1 : la
 *  référence directionnelle sera le moteur).
 *
 * La GÉOMÉTRIE des pièces (dimensions visuelles) vit dans le rendu (scenes/Plane),
 * pas ici : ce module ne décrit que la composition + sert au calcul des stats.
 */

export interface PlacedPart {
  /** id d'une pièce du catalogue (core/parts). */
  partId: string
  /** Position dans le repère local de l'avion. */
  position: [number, number, number]
  /** Rotation (Euler, radians). */
  rotation?: [number, number, number]
  /** Échelle (uniforme ou par axe). */
  scale?: number | [number, number, number]
}

export interface PlaneAssembly {
  readonly id: string
  readonly name: string
  readonly parts: PlacedPart[]
}
