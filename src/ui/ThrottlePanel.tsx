import { useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useThrottle } from '../store/throttle'
import { getPart } from '../core/parts'
import type { EngineInstance } from '../core/build/compile'

/**
 * Manette des gaz du HUD vol (S2) : une jauge verticale PAR moteur + une jauge
 * maître « TOUS ». Glissables à la souris ; le clavier (Maj +, Ctrl −) rampe la
 * consigne via PlaneRig. Glisser la maître re-lie tous les moteurs ; glisser une
 * jauge individuelle délie. Les moteurs à postcombustion portent un CRAN : la
 * zone au-dessus engage la PC (fond rougi + jauge orange).
 */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function VerticalGauge({
  value,
  onChange,
  label,
  title,
  detent,
  pcEngaged,
  wide,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  title?: string
  /** Position du cran PC (0..1) — undefined = pas de PC. */
  detent?: number
  pcEngaged?: boolean
  wide?: boolean
}) {
  const track = useRef<HTMLDivElement>(null)
  const setFromPointer = (e: ReactPointerEvent) => {
    const r = track.current?.getBoundingClientRect()
    if (!r) return
    onChange(clamp01(1 - (e.clientY - r.top) / r.height))
  }
  return (
    <div style={styles.gauge} title={title}>
      <div
        ref={track}
        style={{ ...styles.track, width: wide ? 26 : 16 }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setFromPointer(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) setFromPointer(e)
        }}
      >
        {/* Zone PC (au-dessus du cran) */}
        {detent !== undefined && (
          <>
            <div style={{ ...styles.pcZone, height: `${(1 - detent) * 100}%` }} />
            <div style={{ ...styles.detent, bottom: `${detent * 100}%` }} />
          </>
        )}
        <div
          style={{
            ...styles.fill,
            height: `${value * 100}%`,
            background: pcEngaged ? '#ff7a3a' : '#e0a23a',
          }}
        />
      </div>
      <span style={styles.gaugeLabel}>{label}</span>
    </div>
  )
}

export function ThrottlePanel({ engines, pcDetent }: { engines: EngineInstance[]; pcDetent: number }) {
  const master = useThrottle((s) => s.master)
  const linked = useThrottle((s) => s.linked)
  const perEngine = useThrottle((s) => s.perEngine)
  const reverse = useThrottle((s) => s.reverse)
  const setMaster = useThrottle((s) => s.setMaster)
  const setEngine = useThrottle((s) => s.setEngine)
  const setLinked = useThrottle((s) => s.setLinked)

  if (engines.length === 0) return null

  return (
    <div style={styles.root}>
      {reverse && <div style={styles.reverse}>INV. POUSSÉE</div>}
      <div style={styles.row}>
        {/* Un seul moteur : la jauge maître EST sa jauge. Plusieurs : maître + une par moteur. */}
        {engines.length === 1 ? (
          <VerticalGauge
            value={master}
            onChange={setMaster}
            label="M1"
            title={getPart(engines[0].partId).name}
            detent={engines[0].afterburner ? pcDetent : undefined}
            pcEngaged={!!engines[0].afterburner && !reverse && master > pcDetent}
            wide
          />
        ) : (
          <>
            <VerticalGauge value={master} onChange={setMaster} label="TOUS" wide />
            {engines.map((eng, i) => {
              const lvl = linked ? master : (perEngine[eng.nodeId] ?? master)
              return (
                <VerticalGauge
                  key={eng.nodeId}
                  value={lvl}
                  onChange={(v) => setEngine(eng.nodeId, v)}
                  label={`M${i + 1}`}
                  title={getPart(eng.partId).name}
                  detent={eng.afterburner ? pcDetent : undefined}
                  pcEngaged={!!eng.afterburner && !reverse && lvl > pcDetent}
                />
              )
            })}
          </>
        )}
      </div>
      <div style={styles.footer}>
        <span style={styles.pct}>{Math.round(master * 100)}%</span>
        {engines.length > 1 && (
          <button
            type="button"
            style={{ ...styles.link, ...(linked ? styles.linkOn : null) }}
            onClick={() => setLinked(!linked)}
            title={linked ? 'Moteurs liés (cliquer pour délier)' : 'Moteurs déliés (cliquer pour lier)'}
          >
            {linked ? 'LIÉS' : 'DÉLIÉS'}
          </button>
        )}
      </div>
      <span style={styles.hint}>MAJ + · CTRL −</span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    left: 16,
    bottom: 118,
    zIndex: 15,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'rgba(18, 24, 32, 0.6)',
    borderRadius: 12,
    padding: '10px 12px 8px',
    backdropFilter: 'blur(6px)',
    fontFamily: 'system-ui, sans-serif',
    userSelect: 'none',
    touchAction: 'none',
  },
  row: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  gauge: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  track: {
    position: 'relative',
    height: 110,
    borderRadius: 6,
    background: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    cursor: 'ns-resize',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: '0 0 6px 6px',
    pointerEvents: 'none',
  },
  pcZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    background: 'rgba(255, 90, 40, 0.22)',
    pointerEvents: 'none',
  },
  detent: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    background: '#ff7a3a',
    pointerEvents: 'none',
  },
  gaugeLabel: { fontSize: 9, letterSpacing: 1, color: '#9fb0bd', fontWeight: 700 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pct: {
    fontSize: 12,
    fontWeight: 700,
    color: '#eef3f6',
    fontVariantNumeric: 'tabular-nums',
  },
  link: {
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.1)',
    color: '#cdd9e3',
    fontWeight: 800,
    fontSize: 9,
    padding: '3px 8px',
    borderRadius: 6,
    letterSpacing: 1,
  },
  linkOn: { background: 'rgba(224, 162, 58, 0.25)', color: '#e0a23a' },
  reverse: {
    alignSelf: 'flex-start',
    background: '#c0392b',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
    padding: '3px 8px',
    borderRadius: 6,
  },
  hint: { fontSize: 8, letterSpacing: 0.8, color: '#7d8d99', textAlign: 'center' },
}
