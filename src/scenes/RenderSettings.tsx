import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useControls } from 'leva'
import * as THREE from 'three'

/**
 * Réglages renderer pilotables à chaud : tone mapping ACES Filmic + exposition.
 * (sRGB / outputColorSpace sont déjà gérés par défaut par R3F.)
 */
export function RenderSettings() {
  const gl = useThree((s) => s.gl)
  const { exposure } = useControls('Rendu', {
    exposure: { value: 1.05, min: 0.3, max: 2.5, step: 0.01, label: 'exposition' },
  })

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = exposure
  }, [gl, exposure])

  return null
}
