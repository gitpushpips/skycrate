import type { Aircraft } from '../build/graph'
import { getPart } from '../parts'

/**
 * Sauvegarde / chargement de l'avion (Jalon 2-F). Le graphe (`core/build/graph`)
 * est déjà du JSON simple : on l'enveloppe d'une version + on le **valide** au
 * chargement (racine présente, pièces connues, parents existants) pour ne jamais
 * injecter un graphe corrompu dans l'éditeur. Stockage = `localStorage` (slots)
 * + export/import fichier `.json`.
 */
const PREFIX = 'skycrate.save.'
const SAVE_VERSION = 1

interface SaveFile {
  version: number
  aircraft: Aircraft
}

export function serializeAircraft(aircraft: Aircraft): string {
  return JSON.stringify({ version: SAVE_VERSION, aircraft } satisfies SaveFile, null, 2)
}

/** Parse + valide un JSON de sauvegarde. Lève un message clair si invalide. */
export function parseAircraft(json: string): Aircraft {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('JSON illisible')
  }
  const file = data as Partial<SaveFile>
  if (!file || typeof file !== 'object' || !file.aircraft) throw new Error('Fichier de sauvegarde invalide')
  return validateAircraft(file.aircraft)
}

function validateAircraft(a: Aircraft): Aircraft {
  if (!a || typeof a.rootId !== 'string' || !Array.isArray(a.nodes)) throw new Error('Graphe invalide')
  // Avion vide (page blanche S4-A) : rootId vide + aucun nœud ⇒ valide tel quel.
  if (a.nodes.length === 0 && a.rootId === '') return a
  const ids = new Set(a.nodes.map((n) => n.nodeId))
  if (!ids.has(a.rootId)) throw new Error('Pièce racine introuvable')
  for (const n of a.nodes) {
    getPart(n.partId) // lève « Pièce inconnue: … » si le catalogue ne la connaît pas
    if (n.parentId !== null && !ids.has(n.parentId)) {
      throw new Error(`Parent introuvable pour ${n.partId}`)
    }
  }
  return a
}

/** Noms des slots de sauvegarde (localStorage), triés. */
export function listSaves(): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length))
    }
  } catch {
    /* localStorage indisponible */
  }
  return out.sort((x, y) => x.localeCompare(y))
}

export function saveToSlot(name: string, aircraft: Aircraft): void {
  localStorage.setItem(PREFIX + name, serializeAircraft(aircraft))
}

export function loadFromSlot(name: string): Aircraft {
  const json = localStorage.getItem(PREFIX + name)
  if (!json) throw new Error(`Sauvegarde « ${name} » introuvable`)
  return parseAircraft(json)
}

export function deleteSlot(name: string): void {
  localStorage.removeItem(PREFIX + name)
}

/** Déclenche le téléchargement du graphe en fichier `.json` (action de l'utilisateur). */
export function downloadAircraft(name: string, aircraft: Aircraft): void {
  const blob = new Blob([serializeAircraft(aircraft)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(name || aircraft.name || 'skycrate').replace(/[^\w.-]+/g, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
