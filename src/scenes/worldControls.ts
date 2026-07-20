import { useControls, folder } from 'leva'
import { DEFAULT_TERRAIN, type TerrainParams } from '../core/world/terrain'

/**
 * Réglages du monde procédural à chaud (leva « Monde », 3+A/B/C). 🟡 Tout est
 * hors dossier (calibrage feel) : un seed + les mêmes params ⇒ le même monde.
 * Changer un param régénère le terrain (streaming progressif, cf. Terrain.tsx).
 */
export interface WorldTunables {
  terrain: TerrainParams
  /** Température sous laquelle le sol devient neigeux (0..1, cf. climat 3+C). */
  snowTemp: number
  /** Densité de végétation (multiplicateur) + rayon de peuplement (m). */
  vegDensity: number
  vegRadius: number
  /** Nuages : altitude de la couche (m), dispersion verticale, densité, rayon. */
  cloudAltitude: number
  cloudSpread: number
  cloudDensity: number
  cloudRadius: number
  /** Rayon de chargement des chunks (m) — à garder ≥ fog lointain. */
  viewRadius: number
  /** Rayon plein détail ; au-delà = chunks demi-résolution (LOD). */
  nearRadius: number
  /** Rayon des colliders heightfield autour de l'avion (m). */
  physicsRadius: number
  /** Affiche les colliders Rapier (debug). */
  showColliders: boolean
}

export function useWorldTunables(): WorldTunables {
  const v = useControls('Monde', {
    terrain: folder({
      seed: { value: DEFAULT_TERRAIN.seed, step: 1, label: 'seed' },
      worldRadius: { value: DEFAULT_TERRAIN.worldRadius, min: 800, max: 6000, step: 100, label: 'rayon monde (m)' },
      baseElevation: { value: DEFAULT_TERRAIN.baseElevation, min: 0, max: 30, step: 0.5, label: 'élévation moy. (m)' },
      hillWavelength: { value: DEFAULT_TERRAIN.hillWavelength, min: 120, max: 1200, step: 10, label: 'λ collines (m)' },
      hillHeight: { value: DEFAULT_TERRAIN.hillHeight, min: 0, max: 60, step: 1, label: 'ampl. collines (m)' },
      octaves: { value: DEFAULT_TERRAIN.octaves, min: 1, max: 8, step: 1, label: 'octaves' },
      gain: { value: DEFAULT_TERRAIN.gain, min: 0.2, max: 0.8, step: 0.05, label: 'gain' },
      lacunarity: { value: DEFAULT_TERRAIN.lacunarity, min: 1.5, max: 3, step: 0.1, label: 'lacunarité' },
    }),
    montagnes: folder({
      mountainWavelength: { value: DEFAULT_TERRAIN.mountainWavelength, min: 400, max: 4000, step: 50, label: 'λ masque (m)' },
      mountainHeight: { value: DEFAULT_TERRAIN.mountainHeight, min: 0, max: 300, step: 5, label: 'hauteur (m)' },
      mountainSharpness: { value: DEFAULT_TERRAIN.mountainSharpness, min: 0.5, max: 6, step: 0.1, label: 'contraste' },
    }),
    côtes: folder({
      shoreFalloff: { value: DEFAULT_TERRAIN.shoreFalloff, min: 0.05, max: 0.6, step: 0.01, label: 'fondu côtier' },
      coastWobble: { value: DEFAULT_TERRAIN.coastWobble, min: 0, max: 0.8, step: 0.05, label: 'irrégularité' },
    }),
    lacs: folder({
      lakeWavelength: { value: DEFAULT_TERRAIN.lakeWavelength, min: 300, max: 2000, step: 50, label: 'λ bassins (m)' },
      lakeDepth: { value: DEFAULT_TERRAIN.lakeDepth, min: 0, max: 30, step: 1, label: 'creusement (m)' },
    }),
    climat: folder({
      tempWavelength: { value: DEFAULT_TERRAIN.tempWavelength, min: 600, max: 4000, step: 50, label: 'λ température (m)' },
      humidityWavelength: { value: DEFAULT_TERRAIN.humidityWavelength, min: 600, max: 4000, step: 50, label: 'λ humidité (m)' },
      altitudeLapse: { value: DEFAULT_TERRAIN.altitudeLapse, min: 0, max: 0.01, step: 0.0005, label: 'refroidissement /m' },
      snowTemp: { value: 0.08, min: 0, max: 0.5, step: 0.01, label: 'température neige' },
    }),
    végétation: folder({
      vegDensity: { value: 1, min: 0, max: 3, step: 0.1, label: 'densité' },
      vegRadius: { value: 900, min: 300, max: 1600, step: 50, label: 'rayon (m)' },
    }),
    nuages: folder({
      // Couche au-dessus du plus haut sommet (~118 m) : on vole dessous, dedans
      // ou dessus selon la montée ⇒ l'altitude devient lisible.
      cloudAltitude: { value: 300, min: 60, max: 1200, step: 10, label: 'altitude (m)' },
      cloudSpread: { value: 90, min: 0, max: 400, step: 10, label: 'dispersion (m)' },
      cloudDensity: { value: 1, min: 0, max: 3, step: 0.1, label: 'densité' },
      cloudRadius: { value: 2000, min: 500, max: 4000, step: 100, label: 'rayon (m)' },
    }),
    aérodromes: folder({
      airportCount: { value: DEFAULT_TERRAIN.airportCount, min: 0, max: 24, step: 1, label: 'nombre' },
      airportMinDist: { value: DEFAULT_TERRAIN.airportMinDist, min: 300, max: 1500, step: 50, label: 'espacement min (m)' },
      airportMaxAlt: { value: DEFAULT_TERRAIN.airportMaxAlt, min: 10, max: 120, step: 5, label: 'altitude max (m)' },
      airportFlatness: { value: DEFAULT_TERRAIN.airportFlatness, min: 2, max: 20, step: 1, label: 'tolérance dénivelé (m)' },
    }),
    'rendu terrain': folder({
      viewRadius: { value: 1500, min: 400, max: 2600, step: 50, label: 'rayon chargé (m)' },
      nearRadius: { value: 650, min: 200, max: 1500, step: 50, label: 'rayon plein détail (m)' },
      physicsRadius: { value: 500, min: 260, max: 1200, step: 20, label: 'rayon physique (m)' },
      showColliders: { value: false, label: 'colliders (debug)' },
    }),
  })

  return {
    terrain: {
      seed: v.seed,
      worldRadius: v.worldRadius,
      baseElevation: v.baseElevation,
      hillWavelength: v.hillWavelength,
      hillHeight: v.hillHeight,
      octaves: v.octaves,
      gain: v.gain,
      lacunarity: v.lacunarity,
      mountainWavelength: v.mountainWavelength,
      mountainHeight: v.mountainHeight,
      mountainSharpness: v.mountainSharpness,
      shoreFalloff: v.shoreFalloff,
      coastWobble: v.coastWobble,
      lakeWavelength: v.lakeWavelength,
      lakeDepth: v.lakeDepth,
      tempWavelength: v.tempWavelength,
      humidityWavelength: v.humidityWavelength,
      altitudeLapse: v.altitudeLapse,
      airportCount: v.airportCount,
      airportMinDist: v.airportMinDist,
      airportMaxAlt: v.airportMaxAlt,
      airportFlatness: v.airportFlatness,
    },
    snowTemp: v.snowTemp,
    vegDensity: v.vegDensity,
    vegRadius: v.vegRadius,
    cloudAltitude: v.cloudAltitude,
    cloudSpread: v.cloudSpread,
    cloudDensity: v.cloudDensity,
    cloudRadius: v.cloudRadius,
    viewRadius: v.viewRadius,
    nearRadius: v.nearRadius,
    physicsRadius: v.physicsRadius,
    showColliders: v.showColliders,
  }
}
