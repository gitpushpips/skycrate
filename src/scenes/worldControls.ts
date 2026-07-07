import { useControls, folder } from 'leva'
import { DEFAULT_TERRAIN, type TerrainParams } from '../core/world/terrain'

/**
 * Réglages du monde procédural à chaud (leva « Monde », 3+A). 🟡 Tout est hors
 * dossier (calibrage feel) : un seed + les mêmes params ⇒ le même monde.
 * Changer un param régénère le terrain (streaming progressif, cf. Terrain.tsx).
 */
export interface WorldTunables {
  terrain: TerrainParams
  /** Altitude d'apparition de la neige de sommet (m) — placeholder biome 3+C. */
  snowLine: number
  /** Rayon de chargement des chunks (m) — à garder ≥ fog lointain. */
  viewRadius: number
  /** Rayon plein détail ; au-delà = chunks demi-résolution (LOD). */
  nearRadius: number
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
    'rendu terrain': folder({
      snowLine: { value: 55, min: 10, max: 250, step: 5, label: 'ligne de neige (m)' },
      viewRadius: { value: 1500, min: 400, max: 2600, step: 50, label: 'rayon chargé (m)' },
      nearRadius: { value: 650, min: 200, max: 1500, step: 50, label: 'rayon plein détail (m)' },
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
    },
    snowLine: v.snowLine,
    viewRadius: v.viewRadius,
    nearRadius: v.nearRadius,
  }
}
