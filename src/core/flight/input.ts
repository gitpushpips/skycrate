import { useEffect, useRef } from 'react'

/**
 * Entrées de vol au clavier (étape 5, throttle progressif S2). Axes référencés
 * sur le MOTEUR (règle 1) ; une config propulsive inverse la caméra ⇒ commandes
 * ressenties inversées.
 *
 *   Tangage : W piqué (nez bas)   · S cabré (nez haut)
 *   Roulis  : A gauche            · D droite
 *   Lacet   : Q gauche            · E droite
 *   Gaz     : Maj augmente le régime · Ctrl le diminue (rampe tant que maintenu)
 *   Inverse : C maintenu = inverse de poussée (au régime courant)
 *
 * La postcombustion n'a plus de touche : elle s'engage au-delà du CRAN de la
 * jauge des gaz (S2). La rampe elle-même est intégrée dans PlaneRig (pas fixe).
 */
export interface FlightInputState {
  pitch: number // -1 piqué .. +1 cabré
  roll: number // -1 gauche .. +1 droite
  yaw: number // -1 gauche .. +1 droite
  throttleUp: number // 1 = Maj maintenu (augmenter le régime)
  throttleDown: number // 1 = Ctrl maintenu (réduire le régime)
  reverse: number // 1 = C maintenu (inverse de poussée)
}

const ZERO: FlightInputState = { pitch: 0, roll: 0, yaw: 0, throttleUp: 0, throttleDown: 0, reverse: 0 }

/** Touches de jeu : on bloque les raccourcis navigateur qui les combinent
 *  (Ctrl+S…) quand c'est possible — Ctrl+W reste réservé par le navigateur. */
const GAME_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyC'])

function compute(keys: Set<string>): FlightInputState {
  const k = (code: string) => (keys.has(code) ? 1 : 0)
  return {
    pitch: k('KeyS') - k('KeyW'),
    roll: k('KeyD') - k('KeyA'),
    yaw: k('KeyE') - k('KeyQ'),
    throttleUp: k('ShiftLeft') || k('ShiftRight') ? 1 : 0,
    throttleDown: k('ControlLeft') || k('ControlRight') ? 1 : 0,
    reverse: k('KeyC'),
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
      if ((e.ctrlKey || e.metaKey) && GAME_CODES.has(e.code)) e.preventDefault()
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
