'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { DEMO_ROUTES, Route, NavStep } from '@/data/routes'
import { AttendanceScan } from './AttendanceScan'

// ─── AR Canvas overlay ────────────────────────────────────────────────────────
function drawAROverlay(
  canvas: HTMLCanvasElement,
  step: NavStep,
  pulse: number,
  accessible: boolean
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)

  if (step.direction === 'arrive') return

  const color     = accessible ? '#00b894' : '#CC0000'
  const colorTop  = accessible ? '#006e56' : '#880000'   // top rim face
  const colorEdge = accessible ? '#004535' : '#550000'   // side edge strips

  // ── Forward-tilt 3-D arrow ──────────────────────────────────────────────
  // Y-axis is compressed (TILT_Y < 1) so the arrow looks like a sign leaning
  // toward the viewer at ~55°.  The "back edge" is offset UPWARD in local
  // space, so it appears as a strip above the front face — like a real AR
  // nav arrow floating into the scene.  No drop shadow.
  const sz     = Math.min(W, H) * 0.11
  const bob    = Math.sin(pulse * 0.12) * sz * 0.05
  const TILT_Y = 0.52    // forward lean   (1 = flat, 0 = edge-on)
  const DEPTH  = sz * 0.24  // visible top-rim thickness

  const cx = W / 2
    + (step.direction === 'right' ?  W * 0.10 : 0)
    + (step.direction === 'left'  ? -W * 0.10 : 0)
  const cy = H * 0.46 - bob

  // Arrow shape in local space, pointing UP (+y down in canvas)
  const S: [number, number][] = [
    [  0,           -sz * 0.90 ],  // 0  tip
    [  sz * 0.58,   -sz * 0.03 ],  // 1  right wing outer
    [  sz * 0.28,   -sz * 0.03 ],  // 2  right neck
    [  sz * 0.28,    sz * 0.64 ],  // 3  right base
    [ -sz * 0.28,    sz * 0.64 ],  // 4  left base
    [ -sz * 0.28,   -sz * 0.03 ],  // 5  left neck
    [ -sz * 0.58,   -sz * 0.03 ],  // 6  left wing outer
  ]

  const angle = (step.arrowAngle * Math.PI) / 180
  // Project: apply tilt in local Y, add upward depth offset, then rotate
  const proj = (x: number, y: number, depthOff = 0): [number, number] => {
    const lx = x
    const ly = y * TILT_Y - depthOff    // compress Y + shift back edge up
    const rx = lx * Math.cos(angle) - ly * Math.sin(angle)
    const ry = lx * Math.sin(angle) + ly * Math.cos(angle)
    return [cx + rx, cy + ry]
  }

  const F = S.map(([x, y]) => proj(x, y, 0))       // front face vertices
  const T = S.map(([x, y]) => proj(x, y, DEPTH))    // back/top rim vertices

  const poly = (pts: [number, number][], fill: string, alpha = 1) => {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
  }

  // ── Side edge strips (dark) — connect each front edge to its top counterpart
  for (let i = 0; i < S.length; i++) {
    const j = (i + 1) % S.length
    poly([F[i], F[j], T[j], T[i]], colorEdge, 0.85)
  }

  // ── Top / back rim face — medium brightness ──
  poly(T, colorTop, 0.82)

  // ── Front face — brightest, glow + specular ──
  ctx.save()
  ctx.beginPath()
  F.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
  ctx.closePath()

  ctx.shadowColor = color
  ctx.shadowBlur  = 14 + Math.sin(pulse * 0.22) * 5
  ctx.fillStyle   = color
  ctx.globalAlpha = 0.97
  ctx.fill()

  // Specular: white gradient tip→base, clipped to front face
  const hi = ctx.createLinearGradient(F[0][0], F[0][1], F[3][0], F[3][1])
  hi.addColorStop(0.00, 'rgba(255,255,255,0.52)')
  hi.addColorStop(0.28, 'rgba(255,255,255,0.14)')
  hi.addColorStop(1.00, 'rgba(255,255,255,0.00)')
  ctx.clip()
  ctx.shadowBlur = 0
  ctx.fillStyle  = hi
  ctx.fill()

  // Thin white outline on front face
  ctx.strokeStyle = 'rgba(255,255,255,0.50)'
  ctx.lineWidth   = 1.2
  ctx.stroke()
  ctx.restore()

  // Distance badge — larger, cleaner
  if (step.distance && step.distance !== '0m') {
    const badgeW = 90
    const badgeH = 40
    const badgeX = W - 14 - badgeW
    const badgeY = Math.round(H * 0.54) - badgeH / 2
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.70)'
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12)
    ctx.fill()
    // Coloured left accent bar
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, 5, badgeH, [12, 0, 0, 12])
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Inter, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(step.distance, badgeX + badgeW / 2 + 2, badgeY + badgeH / 2)
    ctx.restore()
  }

}

// ─── Step Image with AR overlay ───────────────────────────────────────────────
function ARStepView({ step, accessible, onDirCycle }: {
  step: NavStep
  accessible: boolean
  onDirCycle: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pulseRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    let running = true
    const animate = () => {
      if (!running) return
      const canvas = canvasRef.current
      if (canvas) {
        // Sync canvas buffer to actual rendered pixel size to prevent stretching
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const w = Math.round(rect.width * dpr)
        const h = Math.round(rect.height * dpr)
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        pulseRef.current += 1
        drawAROverlay(canvas, step, pulseRef.current, accessible)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { running = false; cancelAnimationFrame(rafRef.current) }
  }, [step, accessible])

  // Direction label
  const dirLabel: Record<string, string> = {
    straight: '↑ Straight', left: '← Turn Left', right: '→ Turn Right',
    up: '▲ Go Up', down: '▼ Go Down', arrive: '✓ Arrived!',
  }

  return (
    <div className="absolute inset-0 bg-[#0f1628] overflow-hidden">
      {/* Real campus photo background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={step.imageUrl}
        alt={step.instruction}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* AR Canvas overlay — no width/height here; synced dynamically */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full ar-overlay"
        aria-hidden="true"
      />

      {/* Floor change badge */}
      {step.floorChange && (
        <div className="absolute bottom-3 left-3 bg-amber-400/90 text-black rounded-lg px-3 py-1 text-xs font-bold flex items-center gap-1">
          {step.floorChange.type === 'elevator' ? '🛫' : '🪜'}
          Floor {step.floorChange.from} → {step.floorChange.to}
        </div>
      )}
    </div>
  )
}

// ─── Route Picker — single fixed route ───────────────────────────────────────
function RoutePicker({ onSelect }: { onSelect: (route: Route, accessible: boolean) => void }) {
  const [accessibleMode, setAccessibleMode] = useState(false)
  const route = DEMO_ROUTES[0]

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Fixed route banner */}
      <div className="bg-[#CC0000] rounded-2xl p-4 text-white">
        <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">Your Route</p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0" />
              <span className="font-semibold text-sm">Campus Main Entrance</span>
            </div>
            <div className="w-px h-3 bg-white/20 ml-[5px]" />
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white flex-shrink-0" />
              <span className="font-semibold text-sm">TR-102 Computer Science Lab</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-center">
          <div className="flex-1 bg-white/10 rounded-xl py-1.5">
            <p className="text-base font-bold">210m</p>
            <p className="text-[10px] text-white/50">Distance</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl py-1.5">
            <p className="text-base font-bold">~4 min</p>
            <p className="text-[10px] text-white/50">Walk</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl py-1.5">
            <p className="text-base font-bold">{route.steps.length}</p>
            <p className="text-[10px] text-white/50">Steps</p>
          </div>
        </div>
      </div>

      {/* Accessibility toggle */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#CC0000]/10 rounded-xl flex items-center justify-center text-lg">♿</div>
          <div>
            <p className="text-sm font-semibold text-[#1a1a2e]">Accessible Route</p>
            <p className="text-xs text-[#6b7280]">Elevator &amp; ramp only</p>
          </div>
        </div>
        <button
          onClick={() => setAccessibleMode(a => !a)}
          className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${accessibleMode ? 'bg-[#CC0000]' : 'bg-gray-200'}`}
          aria-label="Toggle accessible mode"
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${accessibleMode ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {/* Route info */}
      <div className="bg-[#CC0000]/5 rounded-2xl px-4 py-3 text-sm text-[#CC0000]">
        <p className="font-semibold text-xs mb-0.5">📍 Route info</p>
        <p className="text-xs text-[#6b7280] leading-relaxed">Main campus gate → Quad → Trent Building → 1st floor CS Lab. AR arrows guide you at each turn.</p>
      </div>

      {/* Start button */}
      <button
        onClick={() => onSelect(route, accessibleMode)}
        className="mt-auto w-full bg-[#CC0000] hover:bg-[#a80000] active:scale-[0.97] text-white font-bold rounded-2xl py-4 transition-all text-base shadow-lg shadow-red-200 mb-2"
      >
        Start Navigation →
      </button>
    </div>
  )
}

// ─── Active Navigation ─────────────────────────────────────────────────────────
function ActiveNavigation({ route, accessible, onEnd }: {
  route: Route
  accessible: boolean
  onEnd: () => void
}) {
  const steps = accessible ? route.accessibleSteps : route.steps
  const [stepIdx, setStepIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dirOverride, setDirOverride] = useState<string | null>(null)
  const [showAttendance, setShowAttendance] = useState(false)
  const currentStep = steps[stepIdx]

  // Reset direction override whenever step changes
  useEffect(() => { setDirOverride(null) }, [stepIdx])

  // Cycle direction: straight → left → right → up → down → (back to step default)
  const DIR_CYCLE = ['straight', 'left', 'right', 'up', 'down']
  const cycleDir = () => {
    const cur = dirOverride ?? currentStep.direction
    const idx = DIR_CYCLE.indexOf(cur)
    const next = DIR_CYCLE[(idx + 1) % DIR_CYCLE.length]
    setDirOverride(next)
  }

  const effectiveStep = dirOverride
    ? { ...currentStep, direction: dirOverride as NavStep['direction'], arrowAngle: dirOverride === 'left' ? 270 : dirOverride === 'right' ? 90 : dirOverride === 'down' ? 180 : 0 }
    : currentStep

  // Auto-advance every 2 seconds unless paused or on last step
  useEffect(() => {
    if (paused || stepIdx === steps.length - 1) return
    const timer = setTimeout(() => setStepIdx(i => i + 1), 1000)
    return () => clearTimeout(timer)
  }, [stepIdx, paused, steps.length])

  // Show attendance scan when arrive step is reached
  useEffect(() => {
    if (currentStep.direction === 'arrive') {
      const t = setTimeout(() => setShowAttendance(true), 1500)
      return () => clearTimeout(t)
    }
  }, [currentStep.direction])

  const progress = ((stepIdx + 1) / steps.length) * 100

  return (
    /* fills the app-shell only — not the full browser viewport */
    <div className="absolute inset-0 z-20 bg-[#0f1628] overflow-hidden">
      {showAttendance && <AttendanceScan onDone={onEnd} />}
      {/* ── Full-screen AR camera fill ── */}
      <div className="absolute inset-0">
        <ARStepView step={effectiveStep} accessible={accessible} onDirCycle={cycleDir} />
      </div>

      {/* ── Top overlay: progress bar only ── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-3 pb-2"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)' }}>
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: accessible ? '#00b894' : '#CC0000' }}
          />
        </div>
      </div>

      {/* ── Distance + direction — floats mid-bottom, independent ── */}
      {currentStep.direction !== 'arrive' && (
        <div className="absolute bottom-36 left-0 right-0 z-10 px-4 flex items-center justify-between">
          {currentStep.distance && currentStep.distance !== '0m' && (
            <div className="flex flex-col items-center bg-black/55 backdrop-blur-sm rounded-2xl px-5 py-2 border border-white/20">
              <span className="text-white font-black text-3xl leading-none tracking-tight">{currentStep.distance}</span>
              <span className="text-white/50 text-[10px] uppercase tracking-widest mt-0.5">away</span>
            </div>
          )}
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 border border-white/20 backdrop-blur-sm ${
            accessible ? 'bg-[#003057]/80' : 'bg-[#CC0000]/80'
          }`}>
            <span className="text-white font-bold text-base">
              {({'straight':'↑ Straight','left':'← Turn Left','right':'→ Turn Right','up':'▲ Go Up','down':'▼ Go Down'} as Record<string,string>)[effectiveStep.direction]}
            </span>
          </div>
        </div>
      )}

      {/* ── Instruction card — always pinned at very bottom ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-3 pb-4"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.0) 100%)' }}>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${accessible ? 'bg-[#00b894]' : 'bg-[#CC0000]'}`}>
              {stepIdx + 1}
            </div>
            <h3 className="font-bold text-white text-sm">{currentStep.instruction}</h3>
          </div>
          <p className="text-white/70 text-xs leading-relaxed">{currentStep.detail}</p>
          {currentStep.floorChange && (
            <div className="mt-2 flex items-center gap-2 text-amber-300 text-xs">
              <span>{currentStep.floorChange.type === 'elevator' ? '🛗 Elevator' : '🪜 Stairs'}</span>
              <span>Floor {currentStep.floorChange.from} → {currentStep.floorChange.to}</span>
            </div>
          )}
          {!currentStep.accessible && accessible && (
            <div className="mt-2 bg-amber-500/20 rounded-lg px-3 py-1.5 text-amber-300 text-xs border border-amber-400/30">
              ⚠️ May not be fully accessible — seek staff assistance
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function NavigateContent() {
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)
  const [accessibleMode, setAccessibleMode] = useState(false)

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[#F7F8FA]">
      {/* Header — hidden during active navigation so camera fills screen edge-to-edge */}
      {!activeRoute && (
        <div className="sticky top-0 z-10 bg-[#CC0000] backdrop-blur border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">
              ← Back
            </Link>
            <div className="w-px h-5 bg-white/20" />
            <h1 className="font-bold text-white">AR Navigate</h1>
          </div>
        </div>
      )}

      {activeRoute ? (
        <div className="relative flex-1 overflow-hidden">
          <ActiveNavigation
            route={activeRoute}
            accessible={accessibleMode}
            onEnd={() => setActiveRoute(null)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6" style={{scrollbarWidth:'none'}}>
          <RoutePicker onSelect={(r, a) => { setActiveRoute(r); setAccessibleMode(a) }} />
        </div>
      )}
    </main>
  )
}

export default function NavigatePage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#F7F8FA] flex items-center justify-center text-[#6b7280]">Loading...</div>}>
      <NavigateContent />
    </Suspense>
  )
}
