import { useMemo } from 'react'
import { Grid, OrbitControls } from '@react-three/drei'
import { Plane } from './Plane'
import { SUN_POSITION } from '../core/world/orientation'
import type { CompiledAircraft } from '../core/build/compile'
import type { PlaneAssembly } from '../core/assembly'

/**
 * Mode HANGAR (Jalon 2-B) : studio neutre + grille de référence + caméra orbitale
 * autour du build. L'avion est affiché depuis le graphe COMPILÉ (`placed`) via le
 * rendu `Plane` existant — pas de physique ici.
 */
export function HangarScene({ aircraft }: { aircraft: CompiledAircraft }) {
  const assembly = useMemo<PlaneAssembly>(
    () => ({ id: 'build', name: 'build', parts: aircraft.placed }),
    [aircraft],
  )

  return (
    <>
      <color attach="background" args={['#3b4a63']} />

      <hemisphereLight args={['#cfe0ff', '#2a3346', 0.8]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.4}
        color="#fff3df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={6}
        shadow-blurSamples={16}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Grid
        position={[0, -1.4, 0]}
        args={[60, 60]}
        infiniteGrid
        cellSize={1}
        cellThickness={0.7}
        cellColor="#5a6682"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#8fa7d6"
        fadeDistance={45}
        fadeStrength={1.5}
      />

      <group position={[0, 0, 0]}>
        <Plane assembly={assembly} />
      </group>

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enableDamping
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 1.9}
      />
    </>
  )
}
