import { Sky } from './Sky'
import { Lights } from './Lights'
import { World } from './World'
import { Scenery } from './Scenery'

/**
 * Décor statique de la scène (hors physique, post-traitement et caméra) : le
 * monde ouvert (océan + îles + pistes) + le décor de l'île de départ. L'avion
 * physique est monté à part dans `<Physics>` (cf. App → PlaneRig).
 */
export function GameScene() {
  return (
    <>
      <Sky />
      <Lights />
      <World />
      <Scenery />
    </>
  )
}
