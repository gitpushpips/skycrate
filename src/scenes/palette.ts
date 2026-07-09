/**
 * Palette low-poly ensoleillée — lisible et chaleureuse.
 * Centralisée ici pour garder une direction artistique cohérente.
 * (Réglable à chaud via leva pour les couleurs sensibles : voir Sky/Lights.)
 */
export const palette = {
  // Atmosphère
  skyTop: '#3a82c4',
  skyHorizon: '#d6ecf7',

  // Lumière
  sunLight: '#fff2d9',
  skyFill: '#bfe0ff',
  groundBounce: '#5c6b36',

  // Sol
  grass: '#86b14b',
  runway: '#9aa0a3',
  runwayLine: '#ece6d4',

  // Monde ouvert : océan + biomes des îles (herbe/neige/désert) + falaises.
  ocean: '#2c6a93',
  oceanFoam: '#bfe3ef',
  biomeGreen: '#86b14b',
  biomeGreenCliff: '#6d5a3b',
  biomeSnow: '#e9eef3',
  biomeSnowCliff: '#9fb0bd',
  biomeDesert: '#d8bf85',
  biomeDesertCliff: '#a98a55',
  terrainRock: '#8b8272',
  seabed: '#2a5a64',
  // Pôles climatiques (3+C) : sol interpolé bilinéairement température × humidité.
  biomeSteppe: '#a3a06a', // froid + sec
  biomeBoreal: '#547a43', // froid + humide
  biomeLush: '#79b648', // chaud + humide
  cactus: '#5c8f4b',
  windsock: '#e8622d',

  // Végétation
  treeTrunk: '#6b4a2f',
  treeFoliage: '#5e8f3e',
  treeFoliageAlt: '#74a84d',

  // Relief lointain
  hill: '#7aa345',

  // Avion (assemblage low-poly, étape 3)
  planeBody: '#c8553a',
  planeWing: '#e6dfcd',
  planeTail: '#a83f2b',
  planeCowl: '#36393d',
  planeHub: '#26282b',
  planeProp: '#4a3526',
  planeTire: '#222428',
  planeStrut: '#787e83',
  planeGlass: '#a9cfdd',
  // Identité moteurs (par type)
  planeMetal: '#9aa1a8', // alu / acier clair
  planeBrass: '#b98a3e', // cuivre / laiton (radial, spinner ancien)
  planeJetBody: '#4a5159', // nacelle réacteur
  planeRocket: '#d8d2c4', // corps fusée clair
  planeRocketTip: '#b23b2b', // ogive
  planeExhaust: '#1c1d20', // tuyère sombre

  // Cockpits (S4-B) — nez + verrière reconnaissables par famille d'avion.
  cockGaBody: '#e9e7df', // GA : fuselage crème
  cockGaStripe: '#2f6db0', // GA : liseré bleu
  cockGaTrim: '#c23b2f', // GA : filet rouge
  cockWarbird: '#5c6142', // warbird : vert olive (dessus)
  cockWarbirdUnder: '#a9c4c4', // warbird : bleu « duck-egg » (dessous)
  cockWarbirdMetal: '#8b8f93', // warbird : capot alu / échappements
  cockGlider: '#eef1f4', // planeur : coque blanche brillante
  cockGliderTrim: '#c9d0d6', // planeur : ombrage de coque
  cockAirliner: '#eef1f4', // ligne : fuselage blanc
  cockAirlinerNose: '#3b4048', // ligne : radome sombre
  cockAirlinerCheat: '#1f4e9b', // ligne : cheatline
  cockWide: '#e7eaee', // gros porteur : blanc cassé
  cockWideTrim: '#9fb7cf', // gros porteur : bandeau
  cockFighter: '#5b636d', // chasse : gris furtif
  cockFighterDark: '#2b2f35', // chasse : facettes sombres / cadre
  cockFighterGold: '#c7a545', // chasse : verrière teintée or (iconique)
  cockGlassDark: '#12202e', // vitres sombres (hublots poste, verrières)
  cockFrame: '#30343a', // montants de verrière
} as const
