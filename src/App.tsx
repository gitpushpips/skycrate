import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { PostFX } from './scenes/PostFX'
import { RenderSettings } from './scenes/RenderSettings'
import { HangarScene } from './scenes/HangarScene'
import { FlightScene } from './scenes/FlightScene'
import { useFlightTunables } from './scenes/flightControls'
import { useEconomyTunables } from './scenes/economyControls'
import { Hud } from './ui/Hud'
import { MapOverlay } from './ui/MapOverlay'
import { OutOfBounds } from './ui/OutOfBounds'
import { RespawnFade } from './ui/RespawnFade'
import { StatsPanel } from './ui/StatsPanel'
import { PartsPalette } from './ui/PartsPalette'
import { PartInspector } from './ui/PartInspector'
import { EditorTools } from './ui/EditorTools'
import { EditorHint } from './ui/EditorHint'
import { ThrottleGauge } from './ui/ThrottleGauge'
import { ThrottlePanel } from './ui/ThrottlePanel'
import { SaveLoadPanel } from './ui/SaveLoadPanel'
import { ModeToggle } from './ui/ModeToggle'
import { SettingsMenu } from './ui/SettingsMenu'
import { compileAircraft } from './core/build/compile'
import { coinsAvailable } from './core/economy'
import { useBuild } from './store/build'
import { useSettings } from './store/settings'

/**
 * Boucle construire → voler → ajuster (Jalon 2). Le graphe d'avion (store `build`)
 * est compilé à la volée ; selon le mode on rend le HANGAR (éditeur) ou le VOL.
 *
 * Commandes vol : W/S tangage, A/D roulis, Q/E lacet, Maj gaz + / Ctrl gaz −
 * (rampe progressive S2, PC au-delà du cran de la jauge), C inverse, R reset.
 */
export default function App() {
  const flight = useFlightTunables()
  const { coinsBudget } = useEconomyTunables()
  const aircraftGraph = useBuild((s) => s.aircraft)
  const mode = useBuild((s) => s.mode)
  const aircraft = useMemo(() => compileAircraft(aircraftGraph), [aircraftGraph])
  const available = coinsAvailable(coinsBudget, aircraft.stats.totalCost)
  const showLeva = useSettings((s) => s.showLeva)

  return (
    <>
      {/* Panneau de réglages fins (leva) : masqué par défaut, ouvrable depuis le
          menu Paramètres (S6). Sert au calibrage physique/rendu/économie. */}
      <Leva collapsed hidden={!showLeva} />
      <Canvas
        frameloop="always"
        shadows="variance"
        dpr={[1, 2]}
        camera={{ position: [9, 4, 13], fov: 50, near: 0.1, far: 4000 }}
        gl={{ antialias: false }}
      >
        <RenderSettings />
        <Suspense fallback={null}>
          {mode === 'hangar' ? (
            <HangarScene aircraft={aircraft} coinsAvailable={available} />
          ) : (
            <FlightScene aircraft={aircraft} tunables={flight} />
          )}
        </Suspense>
        <PostFX />
      </Canvas>

      <ModeToggle />
      <SettingsMenu />
      {mode === 'hangar' ? (
        <>
          <PartsPalette available={available} />
          <StatsPanel aircraft={aircraft} budget={coinsBudget} available={available} />
          <PartInspector />
          <EditorTools />
          <ThrottleGauge />
          <SaveLoadPanel />
          <EditorHint />
        </>
      ) : (
        <>
          <Hud />
          <ThrottlePanel engines={aircraft.engines} pcDetent={flight.pcDetent} />
          <MapOverlay />
          <OutOfBounds />
          <RespawnFade />
        </>
      )}
    </>
  )
}
