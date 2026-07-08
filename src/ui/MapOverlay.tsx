import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'
import { buildWorld } from '../core/world/airports'
import { AIRPORTS, SEA_Y } from '../core/world/world'
import type { TerrainParams } from '../core/world/terrain'
import { rampColor } from '../scenes/terrainRamp'
import { useWorldTunables } from '../scenes/worldControls'
import { useWorldUi, VISIT_CELL } from '../store/world'
import { useHud } from '../store/hud'

/**
 * Carte du monde (3+E, touche M) : fond peint avec la même rampe biomique que
 * le terrain, BROUILLARD DE DÉCOUVERTE (seules les zones survolées sont
 * révélées), aérodromes découverts, position/cap de l'avion, et MARQUEUR
 * posable au clic (matérialisé en jeu par un faisceau). Nord = haut = soleil.
 */
const MAP_PX = 460
const SAMPLES = 230
const REDRAW_MS = 400

const _c = new THREE.Color()
const _water = new THREE.Color('#2c6a93')
const _deep = new THREE.Color('#16374a')

function paintBase(terrain: ReturnType<typeof buildWorld>['terrain'], snowTemp: number): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = SAMPLES
  cv.height = SAMPLES
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(SAMPLES, SAMPLES)
  const extent = terrain.params.worldRadius * 1.06
  for (let py = 0; py < SAMPLES; py++) {
    const z = -extent + ((py + 0.5) / SAMPLES) * extent * 2
    for (let px = 0; px < SAMPLES; px++) {
      const x = -extent + ((px + 0.5) / SAMPLES) * extent * 2
      const h = terrain.heightAt(x, z)
      if (h < SEA_Y) {
        _c.copy(_water).lerp(_deep, Math.min(1, (SEA_Y - h) / 12))
      } else {
        const { temperature, humidity } = terrain.climateAt(x, z, h)
        rampColor(_c, h, 0, temperature, humidity, snowTemp)
      }
      const k = (py * SAMPLES + px) * 4
      img.data[k] = Math.round(_c.r * 255)
      img.data[k + 1] = Math.round(_c.g * 255)
      img.data[k + 2] = Math.round(_c.b * 255)
      img.data[k + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cv
}

export function MapOverlay() {
  const tunables = useWorldTunables()
  const open = useWorldUi((s) => s.mapOpen)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseRef = useRef<{ key: string; cv: HTMLCanvasElement } | null>(null)

  // M = ouvrir/fermer, Échap = fermer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') useWorldUi.setState((s) => ({ mapOpen: !s.mapOpen }))
      else if (e.code === 'Escape') useWorldUi.setState({ mapOpen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Découverte liée au seed courant.
  useEffect(() => {
    useWorldUi.getState().ensureSeed(tunables.terrain.seed)
  }, [tunables.terrain.seed])

  // Boucle de dessin tant que la carte est ouverte.
  const terrainKey = JSON.stringify(tunables.terrain)
  useEffect(() => {
    if (!open) return
    const { terrain, airports } = buildWorld(JSON.parse(terrainKey) as TerrainParams)
    const snowTemp = tunables.snowTemp
    if (baseRef.current?.key !== terrainKey + snowTemp) {
      baseRef.current = { key: terrainKey + snowTemp, cv: paintBase(terrain, snowTemp) }
    }
    const extent = terrain.params.worldRadius * 1.06
    const toPx = (wx: number) => ((wx + extent) / (2 * extent)) * MAP_PX
    const allAirports = [...AIRPORTS, ...airports]

    const draw = () => {
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx || !baseRef.current) return
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(baseRef.current.cv, 0, 0, MAP_PX, MAP_PX)

      // Brouillard de découverte : assombrit les cellules jamais survolées.
      const st = useWorldUi.getState()
      ctx.fillStyle = 'rgba(9, 13, 19, 0.82)'
      const cellPx = (VISIT_CELL / (2 * extent)) * MAP_PX
      const nCells = Math.ceil((2 * extent) / VISIT_CELL)
      const c0 = Math.floor(-extent / VISIT_CELL)
      for (let j = 0; j <= nCells; j++) {
        for (let i = 0; i <= nCells; i++) {
          if (!st.visited[`${c0 + i},${c0 + j}`]) {
            ctx.fillRect(toPx((c0 + i) * VISIT_CELL), toPx((c0 + j) * VISIT_CELL), cellPx + 0.5, cellPx + 0.5)
          }
        }
      }

      // Bord du monde (hors-limites au-delà).
      ctx.strokeStyle = 'rgba(216, 66, 58, 0.85)'
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(MAP_PX / 2, MAP_PX / 2, (terrain.params.worldRadius / (2 * extent)) * MAP_PX, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Aérodromes découverts.
      ctx.textAlign = 'center'
      ctx.font = '600 10px system-ui, sans-serif'
      for (const a of allAirports) {
        if (!st.discovered[a.id]) continue
        const px = toPx(a.position[0])
        const py = toPx(a.position[2])
        ctx.fillStyle = '#eef3f6'
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#1a2230'
        ctx.lineWidth = 1.4
        // Orientation de piste.
        ctx.beginPath()
        ctx.moveTo(px - Math.sin(a.heading) * 5, py + Math.cos(a.heading) * 5)
        ctx.lineTo(px + Math.sin(a.heading) * 5, py - Math.cos(a.heading) * 5)
        ctx.stroke()
        ctx.fillStyle = '#eef3f6'
        ctx.fillText(a.name, px, py - 8)
      }

      // Marqueur posé.
      if (st.marker) {
        const px = toPx(st.marker[0])
        const py = toPx(st.marker[1])
        ctx.strokeStyle = '#e8622d'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(px, py, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(px, py - 9)
        ctx.lineTo(px, py + 9)
        ctx.moveTo(px - 9, py)
        ctx.lineTo(px + 9, py)
        ctx.stroke()
      }

      // Avion (position + cap ; nord = haut).
      const hud = useHud.getState()
      const px = toPx(hud.x)
      const py = toPx(hud.z)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(hud.heading)
      ctx.fillStyle = '#ffd23e'
      ctx.strokeStyle = '#1a2230'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, -8)
      ctx.lineTo(5.5, 7)
      ctx.lineTo(0, 3.5)
      ctx.lineTo(-5.5, 7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    draw()
    const id = setInterval(draw, REDRAW_MS)
    return () => clearInterval(id)
  }, [open, terrainKey, tunables.snowTemp])

  if (!open) return null

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const extent = tunables.terrain.worldRadius * 1.06
    const wx = ((e.clientX - rect.left) / rect.width) * 2 * extent - extent
    const wz = ((e.clientY - rect.top) / rect.height) * 2 * extent - extent
    useWorldUi.getState().setMarker([wx, wz])
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>CARTE — nord (soleil) en haut</span>
          <button style={styles.clear} onClick={() => useWorldUi.getState().setMarker(null)}>
            Effacer le marqueur
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={MAP_PX}
          height={MAP_PX}
          style={styles.canvas}
          onClick={onClick}
        />
        <div style={styles.hint}>clic = poser le marqueur · M ou Échap = fermer</div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8, 11, 16, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    backdropFilter: 'blur(3px)',
  },
  panel: {
    background: 'rgba(18, 24, 32, 0.92)',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 16,
  },
  title: { color: '#9fb0bd', fontSize: 12, letterSpacing: 2, fontWeight: 700 },
  clear: {
    background: 'rgba(255,255,255,0.08)',
    color: '#eef3f6',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '4px 10px',
    fontSize: 11,
    cursor: 'pointer',
  },
  canvas: { display: 'block', borderRadius: 10, cursor: 'crosshair' },
  hint: { color: '#9fb0bd', fontSize: 11, textAlign: 'center', marginTop: 8 },
}
