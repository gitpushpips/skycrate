import { useEffect, useRef } from 'react'

/**
 * Entrées de vol au clavier (étape 5). Axes référencés sur le MOTEUR (règle 1) ;
 * une config propulsive inverse la caméra ⇒ commandes ressenties inversées.
 *
 *   Tangage : W piqué (nez bas)   · S cabré (nez haut)
 *   Roulis  : A gauche            · D droite
 *   Lacet   : Q gauche            · E droite
 *   Moteur  : Shift plein gaz     · C inverse        · (rien) arrêt
 */
export interface FlightInputState {
  pitch: number // -1 piqué .. +1 cabré
  roll: number // -1 gauche .. +1 droite
  yaw: number // -1 gauche .. +1 droite
  throttle: number // 1 plein, -1 inverse, 0 arrêt
}

const ZERO: FlightInputState = { pitch: 0, roll: 0, yaw: 0, throttle: 0 }

function compute(keys: Set<string>): FlightInputState {
  const k = (code: string) => (keys.has(code) ? 1 : 0)
  return {
    pitch: k('KeyS') - k('KeyW'),
    roll: k('KeyD') - k('KeyA'),
    yaw: k('KeyE') - k('KeyQ'),
    throttle: k('ShiftLeft') || k('ShiftRight') ? 1 : k('KeyC') ? -1 : 0,
  }
}

export function useFlightInput() {
  const stateRef = useRef<FlightInputState>({ ...ZERO })

  useEffect(() => {
    const keys = new Set<string>()
    const refresh = () => {
      stateRef.current = compute(keys)
    }
    const onDown = (e: KeyboardEvent) => {
      keys.add(e.code)
      refresh()
    }
    const onUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
      refresh()
    }
    const onBlur = () => {
      keys.clear()
      stateRef.current = { ...ZERO }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return stateRef
}
