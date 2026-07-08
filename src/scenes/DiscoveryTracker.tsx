import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useWorldUi } from '../store/world'

/** Rayon de découverte d'un aérodrome (m). */
const DISCOVER_RADIUS = 350

/**
 * Brouillard de découverte (3+E) : à ~2 Hz, marque les cellules survolées
 * (révèle la carte) et découvre les aérodromes approchés à moins de 350 m.
 * La caméra suit l'avion de ~11 m ⇒ elle suffit comme position.
 */
export function DiscoveryTracker({
  airports,
}: {
  airports: { id: string; position: readonly [number, number, number] }[]
}) {
  const tick = useRef(0)
  useFrame(({ camera }) => {
    if (++tick.current % 30 !== 0) return
    const st = useWorldUi.getState()
    st.visitAround(camera.position.x, camera.position.z)
    for (const a of airports) {
      if (
        !st.discovered[a.id] &&
        Math.hypot(a.position[0] - camera.position.x, a.position[2] - camera.position.z) <
          DISCOVER_RADIUS
      ) {
        st.discover(a.id)
      }
    }
  })
  return null
}
