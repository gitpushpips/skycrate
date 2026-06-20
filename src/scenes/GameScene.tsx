import { Sky } from './Sky'
import { Lights } from './Lights'
import { Ground } from './Ground'
import { Scenery } from './Scenery'
import { palette } from './palette'

/**
 * Contenu 3D de la scène (hors post-traitement et contrôles caméra).
 * À l'étape 3, le cube placeholder sera remplacé par l'avion assemblé en dur.
 */
export function GameScene() {
  return (
    <>
      <Sky />
      <Lights />
      <Ground />
      <Scenery />

      {/* Placeholder de l'avion — remplacé à l'étape 3 */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[2.2, 1, 4.4]} />
        <meshStandardMaterial color={palette.plane} flatShading />
      </mesh>
    </>
  )
}
