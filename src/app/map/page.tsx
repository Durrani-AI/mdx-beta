'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { BUILDINGS, ROOMS, Building, Room } from '@/data/rooms'
import { predictCrowdHeatmap, getTrafficLevel } from '@/lib/pathfinding'

// ─── Canvas dimensions match SVG viewBox ─────────────────────────────────────
const W = 380
const H = 480

// ─── Heatmap zones aligned to actual MDX building footprints ─────────────────
const ZONES = [
  { id: 'trent',    x: 155, y: 218, w: 92,  h: 94  },  // College Building
  { id: 'grove',   x: 15,  y: 105, w: 76,  h: 92  },  // Grove
  { id: 'cat',     x: 155, y: 65,  w: 86,  h: 62  },  // MDX House
  { id: 'sheppard',x: 215, y: 155, w: 116, h: 56  },  // Sheppard Library
  { id: 'quad',    x: 102, y: 212, w: 60,  h: 76  },  // Hatchcroft
  { id: 'sports',  x: 295, y: 245, w: 60,  h: 66  },  // Williams
]

function densityColor(v: number, alpha = 1): string {
  if (v < 40) return `rgba(22,163,74,${alpha})`
  if (v < 70) return `rgba(217,119,6,${alpha})`
  return            `rgba(204,0,0,${alpha})`
}

interface Particle {
  zoneId: string; x: number; y: number; vx: number; vy: number
  radius: number; alpha: number; trail: { x: number; y: number }[]
}

function makeParticles(heatmap: Record<string, number>): Particle[] {
  return ZONES.flatMap(zone => {
    const density = heatmap[zone.id] ?? 10
    const count = Math.round(3 + (density / 100) * 22)
    return Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.3 + Math.random() * 0.7
      return { zoneId: zone.id, x: zone.x + Math.random() * zone.w, y: zone.y + Math.random() * zone.h,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2, alpha: 0.55 + Math.random() * 0.45, trail: [] }
    })
  })
}

function tickParticles(particles: Particle[]) {
  const zoneMap = Object.fromEntries(ZONES.map(z => [z.id, z]))
  for (const p of particles) {
    const z = zoneMap[p.zoneId]; if (!z) continue
    p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 5) p.trail.shift()
    p.x += p.vx; p.y += p.vy
    if (p.x < z.x || p.x > z.x + z.w) { p.vx *= -1; p.x = Math.max(z.x, Math.min(z.x + z.w, p.x)) }
    if (p.y < z.y || p.y > z.y + z.h) { p.vy *= -1; p.y = Math.max(z.y, Math.min(z.y + z.h, p.y)) }
    if (Math.random() < 0.02) {
      const a = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 0.6
      const s = Math.hypot(p.vx, p.vy)
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s
    }
  }
}

function drawFrame(canvas: HTMLCanvasElement, particles: Particle[], heatmap: Record<string, number>, scale: number) {
  const ctx = canvas.getContext('2d'); if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const zone of ZONES) {
    const density = heatmap[zone.id] ?? 10
    ctx.fillStyle = densityColor(density, 0.10)
    ctx.beginPath(); ctx.roundRect(zone.x * scale, zone.y * scale, zone.w * scale, zone.h * scale, 6 * scale); ctx.fill()
  }
  for (const p of particles) {
    const density = heatmap[p.zoneId] ?? 10
    for (let t = 0; t < p.trail.length; t++) {
      const pt = p.trail[t]
      ctx.beginPath(); ctx.arc(pt.x * scale, pt.y * scale, p.radius * 0.5 * scale, 0, Math.PI * 2)
      ctx.fillStyle = densityColor(density, (t / p.trail.length) * p.alpha * 0.3); ctx.fill()
    }
    ctx.shadowBlur = 5 * scale; ctx.shadowColor = densityColor(density, 1)
    ctx.beginPath(); ctx.arc(p.x * scale, p.y * scale, p.radius * scale, 0, Math.PI * 2)
    ctx.fillStyle = densityColor(density, p.alpha); ctx.fill()
    ctx.shadowBlur = 0
  }
}

function HeatmapCanvas({ heatmap }: { heatmap: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const heatRef = useRef(heatmap)
  useEffect(() => { heatRef.current = heatmap; particlesRef.current = makeParticles(heatmap) }, [heatmap])
  const animate = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    tickParticles(particlesRef.current)
    drawFrame(canvas, particlesRef.current, heatRef.current, canvas.width / W)
    rafRef.current = requestAnimationFrame(animate)
  }, [])
  useEffect(() => { rafRef.current = requestAnimationFrame(animate); return () => cancelAnimationFrame(rafRef.current) }, [animate])
  return <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto rounded-xl" style={{ display: 'block' }} />
}

export default function MapPage() {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [heatmap, setHeatmap] = useState<Record<string, number>>(() => predictCrowdHeatmap(new Date().getHours()))
  const [hour, setHour] = useState(new Date().getHours())
  const [showHeat, setShowHeat] = useState(true)

  useEffect(() => { setHeatmap(predictCrowdHeatmap(hour)) }, [hour])

  const handleBuildingClick = (b: Building) => {
    setSelectedBuilding(b === selectedBuilding ? null : b)
    setRooms(ROOMS.filter(r => r.building === b.id))
  }

  const trafficLevel = getTrafficLevel(hour)
  const trafficLabel = { low: '🟢 Low', medium: '🟡 Moderate', high: '🔴 Busy' }[trafficLevel]
  const trafficColor = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-[#CC0000]' }[trafficLevel]

  return (
    <main className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{scrollbarWidth:'none'}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#CC0000] border-b border-white/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/70 hover:text-white text-sm">← Back</Link>
            <div className="w-px h-5 bg-white/20" />
            <h1 className="font-bold text-white text-sm">🗺️ Campus Map</h1>
          </div>
          <button
            onClick={() => setShowHeat(h => !h)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${showHeat ? 'bg-white/25 text-white' : 'bg-white/10 text-white/60'}`}
          >
            {showHeat ? '🔥 Heatmap On' : '🔥 Heatmap Off'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Time slider */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-[#6b7280] font-medium uppercase tracking-wide">Simulate time</p>
              <p className="text-xl font-bold text-[#1a1a2e] font-mono">{String(hour).padStart(2,'0')}:00</p>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${trafficColor}`}>{trafficLabel}</span>
              <p className="text-[10px] text-[#6b7280] mt-1">AI Prediction</p>
            </div>
          </div>
          <input type="range" min={6} max={22} value={hour} onChange={e => setHour(Number(e.target.value))} className="w-full accent-[#CC0000]" />
          <div className="flex justify-between text-[10px] text-[#6b7280] mt-1">
            <span>6am</span><span>12pm</span><span>6pm</span><span>10pm</span>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="relative">
            {/* ── Realistic MDX campus SVG ── */}
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">

              {/* Background — warm beige campus ground */}
              <rect width={W} height={H} fill="#f5ede0" />

              {/* ── Green areas ─────────────────────────────────────────── */}
              {/* Sports pitches top-right */}
              <rect x="216" y="4" width="64" height="52" rx="4" fill="#b8ddb0" />
              <text x="248" y="35" textAnchor="middle" fontSize="7" fill="#4a7c59" fontWeight="500">3G Pitches</text>
              {/* Grove Park (between Grove and MDX House) */}
              <rect x="92" y="72" width="62" height="68" rx="4" fill="#c5e8bc" />
              <text x="123" y="109" textAnchor="middle" fontSize="7" fill="#4a7c59" fontWeight="500">Grove Park</text>
              {/* The Paddock bottom-right */}
              <rect x="224" y="360" width="130" height="88" rx="4" fill="#c5e8bc" />
              <text x="289" y="407" textAnchor="middle" fontSize="7" fill="#4a7c59" fontWeight="500">The Paddock</text>
              {/* Scholars Courtyard */}
              <rect x="248" y="218" width="44" height="30" rx="3" fill="#d8edd4" />
              <text x="270" y="236" textAnchor="middle" fontSize="6" fill="#4a7c59">Courtyard</text>

              {/* ── Roads ───────────────────────────────────────────────── */}
              {/* The Burroughs — main horizontal road at bottom */}
              <rect x="0" y="355" width="356" height="18" fill="#ddd0bb" />
              <text x="140" y="367" textAnchor="middle" fontSize="7.5" fill="#9a8a72" fontWeight="600" letterSpacing="0.5">The Burroughs</text>
              {/* Greyhound Hill — vertical road right side */}
              <rect x="354" y="280" width="26" height="200" fill="#ddd0bb" />
              <text x="367" y="390" textAnchor="middle" fontSize="6.5" fill="#9a8a72" fontWeight="600" transform="rotate(90,367,390)" letterSpacing="0.3">Greyhound Hill</text>
              {/* Internal path between buildings */}
              <rect x="155" y="145" width="8" height="78" fill="#e8d8c4" opacity="0.8" />
              <rect x="92" y="196" width="66" height="8" fill="#e8d8c4" opacity="0.8" />

              {/* ── Non-MDX surrounding buildings (tan/orange) ──────────── */}
              {/* Sports Pavilion */}
              <rect x="292" y="22" width="52" height="38" rx="5" fill="#e8a87c" />
              <text x="318" y="37" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#fff">Sports</text>
              <text x="318" y="48" textAnchor="middle" fontSize="7" fill="#fff">Pavilion</text>

              {/* Hendon Town Hall */}
              <rect x="5" y="215" width="68" height="55" rx="5" fill="#d4956a" />
              <text x="39" y="239" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff">Hendon</text>
              <text x="39" y="250" textAnchor="middle" fontSize="7" fill="#fff">Town Hall</text>

              {/* Building 9 */}
              <rect x="68" y="162" width="36" height="50" rx="4" fill="#d4ac84" />
              <text x="86" y="191" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#fff">Bldg 9</text>

              {/* Hendon Library */}
              <rect x="66" y="270" width="40" height="52" rx="4" fill="#d4ac84" />
              <text x="86" y="296" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff">Hendon</text>
              <text x="86" y="307" textAnchor="middle" fontSize="6.5" fill="#fff">Library</text>

              {/* Sunny Hill House */}
              <rect x="296" y="192" width="58" height="48" rx="5" fill="#d4ac84" />
              <text x="325" y="213" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#fff">Sunny Hill</text>
              <text x="325" y="224" textAnchor="middle" fontSize="6.5" fill="#fff">House</text>

              {/* Williams Building */}
              <rect x="298" y="248" width="56" height="62" rx="5" fill="#d4956a" />
              <text x="326" y="275" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#fff">Williams</text>
              <text x="326" y="287" textAnchor="middle" fontSize="7" fill="#fff">Building</text>

              {/* Barn */}
              <rect x="298" y="318" width="40" height="30" rx="4" fill="#d4ac84" />
              <text x="318" y="337" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff">Barn</text>

              {/* Pavillon (small) */}
              <rect x="110" y="192" width="42" height="20" rx="3" fill="#d4c4a8" />
              <text x="131" y="205" textAnchor="middle" fontSize="6.5" fill="#8a7860">Pavillon</text>

              {/* Ravensfield */}
              <rect x="14" y="372" width="60" height="40" rx="5" fill="#d4ac84" />
              <text x="44" y="396" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff">Ravensfield</text>

              {/* Fenella Building */}
              <rect x="82" y="372" width="58" height="40" rx="5" fill="#d4956a" />
              <text x="111" y="396" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff">Fenella</text>

              {/* Usher Halls */}
              <rect x="148" y="375" width="68" height="42" rx="5" fill="#d4956a" />
              <text x="182" y="399" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#fff">Usher Halls</text>

              {/* ── MDX Red Buildings (clickable) ───────────────────────── */}
              {BUILDINGS.map(b => {
                const { x, y, w, h } = b.coords
                const sel = selectedBuilding?.id === b.id
                const density = heatmap[b.id] ?? 0
                const pulse = density > 70
                return (
                  <g key={b.id} onClick={() => handleBuildingClick(b)} className="cursor-pointer">
                    {/* Glow / pulse ring when very busy */}
                    {pulse && !sel && (
                      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="9"
                        fill="none" stroke="#CC0000" strokeWidth="2" strokeOpacity="0.35">
                        <animate attributeName="stroke-opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
                      </rect>
                    )}
                    <rect x={x} y={y} width={w} height={h} rx="6"
                      fill={sel ? '#003057' : '#CC0000'}
                      stroke={sel ? '#001f3f' : '#a80000'}
                      strokeWidth={sel ? 2.5 : 1.5} />
                    <text x={x + w / 2} y={y + h / 2 - 6} textAnchor="middle" fontSize="9.5" fontWeight="800"
                      fill="#ffffff">{b.shortName}</text>
                    <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" fontSize="8"
                      fill="rgba(255,255,255,0.75)">{Math.round(density)}% busy</text>
                    {sel && (
                      <rect x={x} y={y} width={w} height={h} rx="6" fill="none"
                        stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.5" />
                    )}
                  </g>
                )
              })}

              {/* ── Ritterman building (non-interactive, decorative) ─────── */}
              <rect x="256" y="68" width="68" height="58" rx="6" fill="#CC0000" stroke="#a80000" strokeWidth="1.5" />
              <text x="290" y="91" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">Ritterman</text>
              {/* Living wall leaf icon */}
              <text x="290" y="107" textAnchor="middle" fontSize="11">🍃</text>

              {/* ── College House ─────────────────────────────────────────── */}
              <rect x="168" y="335" width="72" height="18" rx="4" fill="#CC0000" stroke="#a80000" strokeWidth="1.5" />
              <text x="204" y="348" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fff">College House</text>

              {/* ── Map key icons ─────────────────────────────────────────── */}
              {/* Beehives on Grove */}
              <text x="85" y="132" fontSize="11">🐝</text>
              {/* Food/hot drinks on College Bldg */}
              <text x="168" y="248" fontSize="10">☕</text>
              {/* Library icon */}
              <text x="222" y="178" fontSize="9">📚</text>
              {/* Car park P between Ritterman & Sunny Hill */}
              <circle cx="346" cy="178" r="12" fill="#003057" opacity="0.85" />
              <text x="346" y="183" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">P</text>
              {/* Car park P near Williams */}
              <circle cx="346" cy="240" r="11" fill="#003057" opacity="0.85" />
              <text x="346" y="245" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">P</text>

              {/* ── You are here ─────────────────────────────────────────── */}
              <circle cx="114" cy="247" r="6" fill="#003057" />
              <circle cx="114" cy="247" r="12" fill="none" stroke="#003057" strokeOpacity="0.35" strokeWidth="2">
                <animate attributeName="r" from="6" to="18" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <text x="126" y="251" fontSize="7.5" fill="#003057" fontWeight="700">You</text>

              {/* Fire station label */}
              <text x="110" y="340" fontSize="7" fill="#9a8a72" fontWeight="500">🚒 Fire Station</text>
            </svg>

            {/* Animated heatmap particle overlay */}
            {showHeat && (
              <div className="absolute inset-0 pointer-events-none">
                <HeatmapCanvas heatmap={heatmap} />
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
            <span className="text-[10px] text-[#6b7280] font-medium uppercase tracking-wide">Crowd density</span>
            {[['#16a34a', 'Sparse'], ['#d97706', 'Moderate'], ['#CC0000', 'Crowded']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[#6b7280]">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#CC0000' }} />
              <span className="text-[10px] text-[#6b7280]">MDX Building (tap)</span>
            </div>
          </div>
        </div>

        {/* Zone density bars */}
        <div className="grid grid-cols-3 gap-2">
          {ZONES.map(z => {
            const val = heatmap[z.id] ?? 0
            const col = val < 40 ? '#16a34a' : val < 70 ? '#d97706' : '#CC0000'
            const b = BUILDINGS.find(b => b.id === z.id)
            return (
              <div key={z.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] text-[#6b7280] uppercase tracking-wide font-medium truncate">{b?.shortName ?? z.id}</p>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, backgroundColor: col }} />
                </div>
                <p className="text-xs font-bold mt-1" style={{ color: col }}>{Math.round(val)}%</p>
              </div>
            )
          })}
        </div>

        {/* Building room list */}
        {selectedBuilding && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#CC0000]" />
                <h2 className="font-bold text-[#1a1a2e]">{selectedBuilding.name}</h2>
              </div>
              <button onClick={() => setSelectedBuilding(null)} className="text-[#6b7280] hover:text-[#1a1a2e]">✕</button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-sm text-[#6b7280]">No rooms listed for this building.</p>
            ) : (
              <div className="space-y-2">
                {rooms.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-[#1a1a2e]">{r.name}</p>
                      <p className="text-xs text-[#6b7280]">{r.type} · {r.capacity} seats{r.accessible ? ' · ♿' : ''}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-[#CC0000]">
                      {r.floor}F
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}


// ─── Campus dimensions ────────────────────────────────────────────────────────
