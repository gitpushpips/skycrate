import * as THREE from 'three'
import { palette } from './palette'
import { SEA_Y } from '../core/world/world'

/**
 * Rampe biomique (3+C) : sol par climat (bilinéaire température × humidité —
 * continu par construction, aucune frontière nette), neige quand il fait froid
 * (l'altitude refroidit via le lapse ⇒ sommets blancs quel que soit le biome),
 * roche sur pentes, plage et fond immergé par altitude.
 * Partagée entre le terrain (couleurs de sommets) et la carte (MapOverlay).
 */
const C_SAND = new THREE.Color(palette.biomeDesert)
const C_ROCK = new THREE.Color(palette.terrainRock)
const C_SNOW = new THREE.Color(palette.biomeSnow)
const C_SEABED = new THREE.Color(palette.seabed)
const C_FOAM = new THREE.Color(palette.oceanFoam)
// Pôles climatiques : sol = blend bilinéaire température × humidité.
const C_COLD_DRY = new THREE.Color(palette.biomeSteppe)
const C_HOT_DRY = new THREE.Color(palette.biomeDesert)
const C_COLD_WET = new THREE.Color(palette.biomeBoreal)
const C_HOT_WET = new THREE.Color(palette.biomeLush)
const tmpDry = new THREE.Color()
const tmpWet = new THREE.Color()

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

export function rampColor(
  out: THREE.Color,
  h: number,
  slope: number,
  t: number,
  u: number,
  snowTemp: number,
): void {
  tmpDry.copy(C_COLD_DRY).lerp(C_HOT_DRY, t)
  tmpWet.copy(C_COLD_WET).lerp(C_HOT_WET, t)
  // L'herbe tient jusqu'à une sécheresse marquée : seul le vrai sec (u < ~0.3)
  // vire steppe/sable, sinon la prairie reste verte.
  out.copy(tmpDry).lerp(tmpWet, smoothstep(0.15, 0.6, u))
  const snowF = 1 - smoothstep(snowTemp, snowTemp + 0.1, t)
  out.lerp(C_SNOW, snowF)
  // Roche sur les pentes raides (atténuée sous la neige → sommets lisibles).
  out.lerp(C_ROCK, smoothstep(0.55, 1.0, slope) * (1 - 0.6 * snowF))
  // Plages : bande sableuse autour du niveau de la mer.
  out.lerp(C_SAND, 1 - smoothstep(SEA_Y + 0.8, SEA_Y + 2.6, h))
  // ÉCUME DE RIVAGE : liseré clair pile à la ligne d'eau (ressac). Gratuit —
  // c'est une couleur de sommet, donc 0 draw call, et la carte en profite
  // aussi (rampe partagée) : les côtes s'y lisent nettement mieux.
  const d = h - SEA_Y
  out.lerp(C_FOAM, 0.55 * smoothstep(-1.1, -0.25, d) * (1 - smoothstep(0.15, 1.0, d)))
  // Fond immergé : sable → vase sombre avec la profondeur (visible à travers
  // l'eau semi-transparente ⇒ hauts-fonds/lacs clairs, océan profond foncé).
  out.lerp(C_SEABED, smoothstep(0.6, 5.5, SEA_Y - h))
}
