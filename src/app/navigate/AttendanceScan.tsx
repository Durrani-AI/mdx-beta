'use client'
// Real-time face detection + single random liveness gesture for attendance
// face-api.js (smile / head turns) + @mediapipe/hands (thumbs-up)
import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Gesture = 'smile' | 'thumbsup' | 'look_left' | 'look_right' | 'look_up'
type Phase   = 'loading' | 'face' | 'gesture' | 'done' | 'error'

interface GestureDef {
  id: Gesture
  icon: string
  label: string
  hint: string
  needsHands: boolean
}

const GESTURES: GestureDef[] = [
  { id: 'smile',      icon: '😄', label: 'Smile!',       hint: 'Give a big smile to the camera',        needsHands: false },
  { id: 'thumbsup',  icon: '👍', label: 'Thumbs Up',    hint: 'Hold a thumbs up toward the camera',    needsHands: true  },
  { id: 'look_left',  icon: '👈', label: 'Look Left',    hint: 'Turn your head to the left and hold',   needsHands: false },
  { id: 'look_right', icon: '👉', label: 'Look Right',   hint: 'Turn your head to the right and hold',  needsHands: false },
  { id: 'look_up',    icon: '👆', label: 'Look Up',      hint: 'Tilt your head upward and hold',        needsHands: false },
]

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],
  [15,16],[13,17],[17,18],[18,19],[19,20],[0,17],
]

// ─── Geometry helpers ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isThumbsUp(lm: any[]) {
  return lm[4].y < lm[2].y - 0.04
    && lm[8].y  > lm[6].y
    && lm[12].y > lm[10].y
    && lm[16].y > lm[14].y
    && lm[20].y > lm[18].y
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AttendanceScan({ onDone }: { onDone: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  const [phase,     setPhase]     = useState<Phase>('loading')
  const [loadMsg,   setLoadMsg]   = useState('Starting camera…')
  const [challenge, setChallenge] = useState<GestureDef | null>(null)
  const [holdPct,   setHoldPct]   = useState(0)
  const [errMsg,    setErrMsg]    = useState('')

  // Mutable refs — always current inside loop without re-renders
  const phaseRef     = useRef<Phase>('loading')
  const challengeRef = useRef<GestureDef | null>(null)
  const runRef       = useRef(false)
  const smileHold    = useRef(0)
  const thumbHold    = useRef(0)
  const headHold     = useRef(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceRef      = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handsRef     = useRef<any>(null)
  const streamRef    = useRef<MediaStream | null>(null)

  // ── Anti-spoofing: dual-signal check (nose movement + expression variance) ──
  // A photo/screen has near-zero expression fluctuation even if hand-held and shaking.
  // A real face always has tiny blink/muscle micro-movements that vary expression scores.
  const nosePtsRef     = useRef<{x:number;y:number}[]>([])
  const exprHistRef    = useRef<number[]>([])   // tracks happy+neutral delta each frame
  const spoofFlagRef   = useRef(false)
  const [spoofAlert,   setSpoofAlert] = useState(false)
  const SPOOF_FRAMES   = 45          // ~1.5s at 30fps
  const NOSE_THRESH    = 3.0         // px² — allow for hand tremor
  const EXPR_THRESH    = 0.0012      // expression variance floor — photos can't beat this

  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  // ── Canvas sync ─────────────────────────────────────────────────────────────
  const syncCanvas = useCallback(() => {
    const v = videoRef.current; const c = canvasRef.current
    if (!v || !c) return
    if (c.width !== v.videoWidth  || c.height !== v.videoHeight) {
      c.width  = v.videoWidth  || 640
      c.height = v.videoHeight || 480
    }
  }, [])

  // ── Draw face box + landmarks ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawFace = useCallback((result: any, color: string) => {
    const v = videoRef.current; const c = canvasRef.current
    if (!v || !c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    const sx = c.width / v.videoWidth; const sy = c.height / v.videoHeight
    const { x, y, width, height } = result.detection.box
    ctx.save()
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.shadowBlur = 14; ctx.shadowColor = color
    ctx.beginPath(); ctx.roundRect(x*sx, y*sy, width*sx, height*sy, 12); ctx.stroke()
    ctx.fillStyle = color + '90'
    result.landmarks.positions.forEach((p:{x:number;y:number}) => {
      ctx.beginPath(); ctx.arc(p.x*sx, p.y*sy, 1.8, 0, Math.PI*2); ctx.fill()
    })
    ctx.restore()
  }, [])

  // ── Draw hand skeleton ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawHand = useCallback((lm: any[]) => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.save()
    ctx.strokeStyle = '#CC0000'; ctx.lineWidth = 2.5; ctx.shadowBlur = 6; ctx.shadowColor = '#CC0000'
    HAND_CONNECTIONS.forEach(([a,b]) => {
      ctx.beginPath()
      ctx.moveTo(lm[a].x*c.width, lm[a].y*c.height)
      ctx.lineTo(lm[b].x*c.width, lm[b].y*c.height)
      ctx.stroke()
    })
    ctx.fillStyle = '#CC0000'
    lm.forEach(p => { ctx.beginPath(); ctx.arc(p.x*c.width, p.y*c.height, 3.5, 0, Math.PI*2); ctx.fill() })
    ctx.restore()
  }, [])

  // ── Detection loop ───────────────────────────────────────────────────────────
  const loop = useCallback(async () => {
    const v  = videoRef.current
    const fa = faceRef.current
    if (!runRef.current || !v || !fa) return
    if (v.readyState < 2) {
      setTimeout(() => { rafRef.current = requestAnimationFrame(loop) }, 100)
      return
    }

    syncCanvas()
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    const cur  = phaseRef.current
    const chal = challengeRef.current

    // ── Spoof check: nose movement AND expression variance both must be low ────
    // Real faces: expression scores fluctuate frame-to-frame even when still.
    // Photo/screen: expression scores are essentially constant (variance ≈ 0).
    const checkSpoof = (nosePx:{x:number;y:number}, exprs:{happy:number;neutral:number;surprised:number}) => {
      nosePtsRef.current.push(nosePx)
      // Use combined happy+surprised as liveness signal — these vary most
      exprHistRef.current.push(exprs.happy + exprs.surprised)
      if (nosePtsRef.current.length > SPOOF_FRAMES) nosePtsRef.current.shift()
      if (exprHistRef.current.length > SPOOF_FRAMES) exprHistRef.current.shift()
      if (nosePtsRef.current.length === SPOOF_FRAMES && !spoofFlagRef.current) {
        const xs = nosePtsRef.current.map(p => p.x)
        const ys = nosePtsRef.current.map(p => p.y)
        const mx = xs.reduce((a,b)=>a+b,0)/xs.length
        const my = ys.reduce((a,b)=>a+b,0)/ys.length
        const vx = xs.reduce((a,b)=>a+(b-mx)**2,0)/xs.length
        const vy = ys.reduce((a,b)=>a+(b-my)**2,0)/ys.length
        const em = exprHistRef.current.reduce((a,b)=>a+b,0)/exprHistRef.current.length
        const ev = exprHistRef.current.reduce((a,b)=>a+(b-em)**2,0)/exprHistRef.current.length
        // Flag if nose barely moves AND expressions are frozen — both required
        if ((vx + vy < NOSE_THRESH) && (ev < EXPR_THRESH)) {
          spoofFlagRef.current = true
          setSpoofAlert(true)
          nosePtsRef.current = []
          exprHistRef.current = []
          setTimeout(() => { spoofFlagRef.current = false; setSpoofAlert(false) }, 3500)
        }
      }
    }

    // STEP 1 — silently detect face, then reveal random gesture ────────────────
    if (cur === 'face') {
      try {
        const r = await fa
          .detectSingleFace(v, new fa.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks(true)
          .withFaceExpressions()
        if (r) {
          // Spoof check before advancing
          const nose = r.landmarks.positions[30]
          const c2 = canvasRef.current
          if (c2) checkSpoof({ x: nose.x * (c2.width/v.videoWidth), y: nose.y * (c2.height/v.videoHeight) }, r.expressions)
          if (spoofFlagRef.current) { rafRef.current = requestAnimationFrame(loop); return }

          drawFace(r, '#00b894')
          const pick = GESTURES[Math.floor(Math.random() * GESTURES.length)]
          challengeRef.current = pick
          setChallenge(pick)
          smileHold.current = 0
          thumbHold.current = 0
          headHold.current  = 0
          goPhase('gesture')
        }
      } catch { /* transient */ }
    }

    // STEP 2 — perform the assigned gesture ────────────────────────────────────
    if (cur === 'gesture' && chal) {

      const isFaceGesture = chal.id === 'smile' || chal.id === 'look_left' || chal.id === 'look_right' || chal.id === 'look_up'
      if (isFaceGesture) {
        try {
          const r = await fa
            .detectSingleFace(v, new fa.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceLandmarks(true)
            .withFaceExpressions()

          if (r) {
            // Continuous spoof check during gesture phase too
            const nose2 = r.landmarks.positions[30]
            const c2 = canvasRef.current
            if (c2) checkSpoof({ x: nose2.x * (c2.width/v.videoWidth), y: nose2.y * (c2.height/v.videoHeight) }, r.expressions)

            const headColor: Record<Gesture, string> = {
              smile: '#f97316', thumbsup: '#CC0000',
              look_left: '#a78bfa', look_right: '#60a5fa',
              look_up: '#34d399',
            }
            drawFace(r, headColor[chal.id])

            if (chal.id === 'smile') {
              if (r.expressions.happy > 0.73) {
                smileHold.current++
                if (smileHold.current >= 8) { runRef.current = false; goPhase('done'); return }
              } else { smileHold.current = 0 }
            } else {
              // Head direction detection via nose-tip offset relative to eye centre
              const pts = r.landmarks.positions
              const ex  = (pts[36].x + pts[45].x) / 2   // inter-eye centre x
              const ey  = (pts[36].y + pts[45].y) / 2   // inter-eye centre y
              const fw  = Math.abs(pts[45].x - pts[36].x) || 1  // inter-eye width
              const fh  = Math.abs(pts[8].y  - ey) || 1         // eye-to-chin height
              const yaw   = (pts[30].x - ex) / fw   // >0 = right in raw frame (their left)
              const pitch = (pts[30].y - ey) / fh   // normal ≈ 0.45–0.55

              let aimed = false
              if (chal.id === 'look_left'  && yaw   >  0.15) aimed = true  // nose right of centre in raw = head turned their-left
              if (chal.id === 'look_right' && yaw   < -0.15) aimed = true
              if (chal.id === 'look_up'    && pitch <  0.28) aimed = true

              if (aimed) {
                headHold.current++
                setHoldPct(Math.min(100, Math.round((headHold.current / 10) * 100)))
                if (headHold.current >= 10) { runRef.current = false; goPhase('done'); return }
              } else {
                headHold.current = Math.max(0, headHold.current - 1)
                setHoldPct(Math.round((headHold.current / 10) * 100))
              }
            }
          }
        } catch { /* transient */ }
      }

      if (chal.id === 'thumbsup' && handsRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let handLm: any[] | null = null
        handsRef.current.onResults((res: {multiHandLandmarks?: {x:number;y:number;z:number}[][]}) => {
          handLm = res.multiHandLandmarks?.[0] ?? null
        })
        try { await handsRef.current.send({ image: v }) } catch { /* transient */ }

        if (handLm) {
          drawHand(handLm)
          if (isThumbsUp(handLm)) {
            thumbHold.current++
            const pct = Math.min(100, Math.round((thumbHold.current / 15) * 100))
            setHoldPct(pct)
            if (thumbHold.current >= 15) { runRef.current = false; goPhase('done'); return }
          } else {
            thumbHold.current = Math.max(0, thumbHold.current - 1)
            setHoldPct(Math.round((thumbHold.current / 15) * 100))
          }
        } else {
          thumbHold.current = Math.max(0, thumbHold.current - 1)
          setHoldPct(Math.round((thumbHold.current / 15) * 100))
        }
      }
    }

    if (runRef.current) rafRef.current = requestAnimationFrame(loop)
  }, [syncCanvas, drawFace, drawHand, goPhase])

  // ── Init: camera first, then models ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        // Start camera immediately so user sees themselves while models load
        setLoadMsg('Starting camera…')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }

        setLoadMsg('Loading face models…')
        const faceapi = await import('face-api.js')
        faceRef.current = faceapi
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/weights'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/weights'),
          faceapi.nets.faceExpressionNet.loadFromUri('/weights'),
        ])
        if (cancelled) return

        setLoadMsg('Loading gesture model…')
        const { Hands } = await import('@mediapipe/hands')
        const hands = new Hands({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        })
        hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 })
        handsRef.current = hands
        if (cancelled) return

        runRef.current = true
        goPhase('face')
        rafRef.current = requestAnimationFrame(loop)
      } catch (e) {
        if (!cancelled) {
          setErrMsg(e instanceof Error ? e.message : String(e))
          goPhase('error')
        }
      }
    }
    init()
    return () => {
      cancelled = true
      runRef.current = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      handsRef.current?.close?.()
    }
  }, [loop, goPhase])

  // ─── Done screen ─────────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0f1e] px-6">
      <div className="w-24 h-24 rounded-full bg-[#00b894] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,184,148,0.55)]">
        <span className="text-5xl">✓</span>
      </div>
      <h2 className="text-white font-black text-2xl mb-2 tracking-tight">Attendance Marked!</h2>
      <p className="text-white/60 text-sm text-center mb-10 leading-relaxed max-w-xs">
        Identity verified. Your attendance has been recorded for this session.
      </p>
      <button onClick={onDone}
        className="w-full max-w-xs bg-[#003057] text-white font-bold rounded-2xl py-4 text-base active:scale-[0.97] transition-all shadow-lg">
        Done
      </button>
    </div>
  )

  // ─── Error screen ─────────────────────────────────────────────────────────────
  if (phase === 'error') return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0f1e] px-6 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <h2 className="text-white font-bold text-lg mb-2">Setup Failed</h2>
      <p className="text-white/50 text-xs mb-8 max-w-xs">{errMsg}</p>
      <button onClick={() => window.location.reload()}
        className="bg-[#CC0000] text-white font-bold rounded-2xl px-8 py-3 active:scale-[0.97]">
        Retry
      </button>
    </div>
  )

  // ─── Main camera UI ───────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 z-30 bg-black">

      {/* ── Live camera fill ─────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden">

        {/* Video: mirrored, fills the container */}
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
        />

        {/* Canvas overlay: same mirror, pointer-events off so video is tappable */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Loading spinner over live camera feed */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
            <div className="w-10 h-10 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-white text-sm font-medium px-4 text-center">{loadMsg}</p>
          </div>
        )}

        {/* ── Security alert: photo / screen detected ──────────────── */}
        {spoofAlert && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-950/95 px-6">
            <div className="w-20 h-20 rounded-full bg-[#CC0000] flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(204,0,0,0.7)]">
              <span className="text-4xl">🚨</span>
            </div>
            <h3 className="text-white font-black text-2xl tracking-tight mb-2 text-center">Security Alert</h3>
            <p className="text-white/80 text-sm text-center leading-relaxed max-w-xs">
              Photo or screen image detected.<br/>
              <span className="text-white font-semibold">Please show your real face</span> to continue.
            </p>
            <div className="mt-6 flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#CC0000] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* "Look at camera" prompt while finding face */}
        {phase === 'face' && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
              <p className="text-white font-bold text-base">Look at the camera</p>
            </div>
          </div>
        )}

        {/* Hold progress arc */}
        {phase === 'gesture' && challenge && challenge.id !== 'smile' && holdPct > 0 && (
          <div className="absolute top-4 right-4 bg-black/65 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="relative w-9 h-9 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#CC0000" strokeWidth="3.5"
                  strokeDasharray={`${87.96 * holdPct / 100} 87.96`} strokeLinecap="round"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{holdPct}%</span>
            </div>
            <span className="text-white text-xs font-semibold">Hold it!</span>
          </div>
        )}

        {/* ── Gesture challenge bubble — floats at bottom of camera ── */}
        {phase === 'gesture' && challenge && (
          <div className="absolute bottom-5 left-4 right-4">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">
              <div className="w-12 h-12 rounded-xl bg-[#CC0000]/25 border border-[#CC0000]/50 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{challenge.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-base tracking-tight leading-tight">{challenge.label}</p>
                <p className="text-white/60 text-xs mt-0.5 leading-snug">{challenge.hint}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
