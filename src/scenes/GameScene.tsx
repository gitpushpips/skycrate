import { Sky } from './Sky'
import { Lights } from './Lights'
import { Ground } from './Ground'
import { Scenery } from './Scenery'
import { Plane } from './Plane'
import { J1_PLANE } from '../core/assembly'

/**
 * Contenu 3D de la scène (hors post-traitement et contrôles caméra).
 * L'avion du Jalon 1 est assemblé en dur depuis le catalogue (core/assembly),
 * posé sur la piste. La physique (Rapier) arrive à l'étape 4.
 */
export function GameScene() {
  return (
    <>
      <Sky />
      <Lights />
      <Ground />
      <Scenery />

      {/* Avion assemblé en dur, posé sur la piste (nez = nord = -Z) */}
      <Plane assembly={J1_PLANE} position={[0, 1.29, 0]} />
    </>
  )
}
