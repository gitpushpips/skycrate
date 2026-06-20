import { Sky } from './Sky'
import { Lights } from './Lights'
import { Ground } from './Ground'
import { Scenery } from './Scenery'

/**
 * Décor statique de la scène (hors physique, post-traitement et caméra).
 * L'avion physique est monté à part dans `<Physics>` (cf. App → PlaneRig).
 */
export function GameScene() {
  return (
    <>
      <Sky />
      <Lights />
      <Ground />
      <Scenery />
    </>
  )
}
