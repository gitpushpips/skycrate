import { useEffect, useRef } from 'react'

/**
 * Entrée moteur au clavier (étape 4, minimal pour tester la poussée).
 *   W / ↑ → plein gaz   ·   S / ↓ → inverse   ·   rien → arrêt
 *
 * Les contrôles de vol (tangage/roulis/lacet) viendront à l'étape 5, référencés
 * sur le moteur (règle 1).
 */
export interface EngineInputState {
  full: boolean
  reverse: boolean
}

export function useEngineInput() {
  const state = useRef<EngineInputState>({ full: false, reverse: false })

  useEffect(() => {
    const set = (e: KeyboardEvent, value: boolean) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          state.current.full = value
          break
        case 'KeyS':
        case 'ArrowDown':
          state.current.reverse = value
          break
      }
    }
    const onDown = (e: KeyboardEvent) => set(e, true)
    const onUp = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  return state
}

/** État moteur → throttle : 1 plein, -1 inverse, 0 arrêt. */
export function throttleFrom(state: EngineInputState): number {
  if (state.full) return 1
  if (state.reverse) return -1
  return 0
}
