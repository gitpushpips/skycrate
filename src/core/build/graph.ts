/**
 * Graphe de pièces (Jalon 2) — modèle d'AUTORING de l'éditeur.
 *
 * Arbre : racine = fuselage, chaque nœud porte sa transform RELATIVE au parent
 * (résultat du snap) + ses réglages d'instance. Sérialisable tel quel (save/load).
 * La physique ne consomme JAMAIS ce graphe directement : il est « compilé »
 * (aplati + transformé en repère avion) par `compileAircraft` (cf. compile.ts).
 */

export interface PartSettings {
  /** Moteur monté à l'envers (config propulsive) → inverse la poussée + la réf. directionnelle. */
  engineReversed?: boolean
  /** Limite de poussée max de ce moteur, 0..1. */
  thrustLimit?: number
  /** Force l'axe de commande de la gouverne (sinon dérivé de la catégorie + position). */
  controlAxis?: 'pitch' | 'roll' | 'yaw'
}

export interface PartNode {
  /** Identifiant d'INSTANCE (unique dans l'avion). */
  nodeId: string
  /** Type de pièce (id du catalogue, core/parts). */
  partId: string
  /** Parent dans l'arbre (null = racine). */
  parentId: string | null
  /** Position relative au repère du parent (ou au repère avion pour la racine). */
  position: [number, number, number]
  /** Rotation (Euler, radians) relative au parent. */
  rotation: [number, number, number]
  settings?: PartSettings
  /** Jumeau miroir (mode mirror) : id de l'autre pièce de la paire symétrique. */
  mirrorId?: string
}

export interface Aircraft {
  id: string
  name: string
  rootId: string
  nodes: PartNode[]
}

/** Retourne les enfants directs d'un nœud. */
export function childrenOf(aircraft: Aircraft, nodeId: string): PartNode[] {
  return aircraft.nodes.filter((n) => n.parentId === nodeId)
}

/** Tous les descendants d'un nœud (sous-arbre, hors le nœud lui-même). */
export function descendantsOf(aircraft: Aircraft, nodeId: string): PartNode[] {
  const out: PartNode[] = []
  const stack = childrenOf(aircraft, nodeId)
  while (stack.length) {
    const n = stack.pop()!
    out.push(n)
    stack.push(...childrenOf(aircraft, n.nodeId))
  }
  return out
}
