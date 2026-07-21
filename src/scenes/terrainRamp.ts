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
const tmpRock = new THREE.Color()

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/**
 * @param detail bruit fin −1..1 (facultatif) : GRAIN procédural du sol. Sans
 * lui les grandes surfaces sont des aplats parfaits. C'est notre « texture » —
 * aucun asset, aucune UV, 0 draw call : juste une modulation de la couleur de
 * sommet. Longueur d'onde volontairement grande devant l'espacement des
 * sommets du LOD lointain (8 m), sinon le grain scintillerait au changement
 * de LOD.
 */
export function rampColor(
  out: THREE.Color,
  h: number,
  slope: number,
  t: number,
  u: number,
  snowTemp: number,
  detail = 0,
): void {
  tmpDry.copy(C_COLD_DRY).lerp(C_HOT_DRY, t)
  tmpWet.copy(C_COLD_WET).lerp(C_HOT_WET, t)
  // L'herbe tient jusqu'à une sécheresse marquée : seul le vrai sec (u < ~0.3)
  // vire steppe/sable, sinon la prairie reste verte.
  out.copy(tmpDry).lerp(tmpWet, smoothstep(0.15, 0.6, u))
  const snowF = 1 - smoothstep(snowTemp, snowTemp + 0.1, t)
  out.lerp(C_SNOW, snowF)
  // Roche sur les pentes raides (atténuée sous la neige → sommets lisibles),
  // avec des STRATES horizontales : les falaises se lisent en couches, ce qui
  // donne l'échelle du relief (une paroi unie paraît plate).
  const rockF = smoothstep(0.55, 1.0, slope) * (1 - 0.6 * snowF)
  if (rockF > 0.001) {
    tmpRock.copy(C_ROCK).multiplyScalar(0.86 + 0.14 * Math.sin(h * 0.5 + detail * 2))
    out.lerp(tmpRock, rockF)
  }
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
  // GRAIN : légères variations de luminosité qui cassent l'aplat. Estompé sous
  // l'eau (la nappe lisse le fond) pour ne pas moucheter les hauts-fonds.
  out.multiplyScalar(1 + detail * 0.085 * smoothstep(SEA_Y - 0.5, SEA_Y + 1.5, h))
}
