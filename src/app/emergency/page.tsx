'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type EmergencyType = 'fire' | 'police' | 'medical' | 'lockdown' | null

interface ExitRoute {
  id: string
  name: string
  direction: string
  distance: string
  time: string
  accessible: boolean
  blocked?: boolean
  reason?: string
}

const FIRE_EXITS: ExitRoute[] = [
  { id: 'e1', name: 'Main Gate Exit', direction: 'Head south through Quad', distance: '80m', time: '1 min', accessible: true },
  { id: 'e2', name: 'Trent Building North Exit', direction: 'Ground floor, turn left at lobby', distance: '30m', time: '30s', accessible: true },
  { id: 'e3', name: 'Grove East Fire Exit', direction: 'Emergency door at end of corridor', distance: '25m', time: '20s', accessible: false },
  { id: 'e4', name: 'Library Side Exit', direction: 'Follow green fire exit signs', distance: '40m', time: '40s', accessible: true },
]

const EMERGENCY_CONTACTS = [
  { label: 'Campus Security', number: '020 8411 5000', icon: '🔒', urgent: true },
  { label: 'Emergency (Police/Fire/Ambulance)', number: '999', icon: '🚨', urgent: true },
  { label: 'MDX Emergency Line', number: '020 8411 2345', icon: '📞', urgent: false },
  { label: 'Student Welfare', number: '020 8411 5678', icon: '🤝', urgent: false },
  { label: 'Medical Centre', number: '020 8411 3456', icon: '🏥', urgent: false },
]

const EMERGENCY_CONFIGS: Record<string, { color: string; icon: string; title: string; message: string; exits: ExitRoute[] }> = {
  fire: {
    color: '#e94560',
    icon: '🔥',
    title: 'FIRE ALARM',
    message: 'Evacuate the building immediately. Do not use lifts. Go to the nearest assembly point.',
    exits: FIRE_EXITS,
  },
  police: {
    color: '#e94560',
    icon: '🚓',
    title: 'POLICE INCIDENT',
    message: 'Stay inside and away from windows. Lock your room if possible. Follow instructions from security.',
    exits: [
      { id: 'p1', name: 'Lock yourself in current room', direction: 'Do not move unless told to by police', distance: '0m', time: 'Now', accessible: true },
      { id: 'p2', name: 'Safe Room — Library Level 1', direction: 'If you must move, head to library', distance: '60m', time: '1 min', accessible: true, blocked: false },
    ],
  },
  medical: {
    color: '#fdcb6e',
    icon: '🏥',
    title: 'MEDICAL EMERGENCY',
    message: 'Call 999 immediately. First aid kit locations and nearest AED are shown.',
    exits: [
      { id: 'm1', name: 'AED — Grove Reception', direction: 'Ground floor by main desk', distance: '40m', time: '30s', accessible: true },
      { id: 'm2', name: 'First Aid — Campus Security', direction: 'Security office next to main gate', distance: '70m', time: '1 min', accessible: true },
      { id: 'm3', name: 'AED — Trent Building Lobby', direction: 'Ground floor near elevator', distance: '50m', time: '40s', accessible: true },
    ],
  },
  lockdown: {
    color: '#003057',
    icon: '🔒',
    title: 'LOCKDOWN',
    message: 'Secure your location. Lock doors, silence phones, stay away from windows and doors.',
    exits: [
      { id: 'l1', name: 'Stay in current location', direction: 'Lock the door. Block it if possible.', distance: '0m', time: 'Now', accessible: true },
    ],
  },
}

export default function EmergencyPage() {
  const [activeEmergency, setActiveEmergency] = useState<EmergencyType>(null)
  const [blockedExit, setBlockedExit] = useState<string | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)

  useEffect(() => {
    if (!activeEmergency) return
    const id = setInterval(() => setTimeElapsed(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [activeEmergency])

  const config = activeEmergency ? EMERGENCY_CONFIGS[activeEmergency] : null

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`

  if (activeEmergency && config) {
    const exits = config.exits.map(e => e.id === blockedExit ? { ...e, blocked: true, reason: 'Exit blocked — use alternative' } : e)

    return (
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{scrollbarWidth:'none'}}>
        {/* Emergency header */}
        <div className="sticky top-0 z-20" style={{ backgroundColor: config.color }}>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-pulse">{config.icon}</span>
                <div>
                  <h1 className="font-black text-xl tracking-wide text-white">{config.title}</h1>
                  <p className="text-white/80 text-xs">Active for {formatTime(timeElapsed)}</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveEmergency(null); setTimeElapsed(0); setBlockedExit(null) }}
                className="bg-black/20 rounded-xl px-3 py-1.5 text-sm font-medium text-white"
              >
                All Clear ✓
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Alert message */}
          <div className="bg-white rounded-2xl p-4 border-2 font-medium text-sm leading-relaxed text-[#1a1a2e]" style={{ borderColor: config.color }}>
            {config.message}
          </div>

          {/* Rerouting hint */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🤖</span>
              <h2 className="font-bold text-sm text-[#1a1a2e]">AI Emergency Re-routing</h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-xs text-[#6b7280]">Real-time route recalculation based on blocked paths, crowd density, and emergency responder locations.</p>
            {blockedExit && (
              <div className="mt-2 bg-red-50 rounded-lg px-3 py-2 text-xs text-[#CC0000] border border-red-100">
                ⚠️ Exit blocked — alternative route calculated automatically
              </div>
            )}
          </div>

          {/* Exit routes */}
          <h2 className="font-bold text-[#1a1a2e]">Nearest Exits / Safe Points</h2>
          <div className="space-y-3">
            {exits.map((exit, idx) => (
              <div key={exit.id} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm ${exit.blocked ? 'opacity-40' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${exit.blocked ? 'bg-[#CC0000]' : idx === 0 ? 'bg-[#003057]' : 'bg-gray-300'}`}>
                      {exit.blocked ? '✕' : idx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1a1a2e]">{exit.name}</h3>
                      <p className="text-xs text-[#6b7280] mt-0.5">{exit.direction}</p>
                      {exit.blocked && exit.reason && (
                        <p className="text-xs text-[#CC0000] mt-1">{exit.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-bold" style={{ color: config.color }}>{exit.time}</p>
                    <p className="text-xs text-[#6b7280]">{exit.distance}</p>
                    {exit.accessible && <p className="text-xs text-green-600">♿</p>}
                  </div>
                </div>
                {!exit.blocked && idx === 0 && !blockedExit && (
                  <div className="mt-3 flex gap-2">
                    <Link
                      href="/navigate"
                      className="flex-1 text-center text-xs font-bold py-2 rounded-xl text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      Navigate to Exit
                    </Link>
                    <button
                      onClick={() => setBlockedExit(exit.id)}
                      className="flex-1 text-center text-xs py-2 rounded-xl bg-gray-100 text-[#6b7280]"
                    >
                      Mark Blocked
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Emergency contacts */}
          <h2 className="font-bold text-[#1a1a2e]">Emergency Contacts</h2>
          <div className="space-y-2">
            {EMERGENCY_CONTACTS.map(c => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className={`flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors border ${c.urgent ? 'border-[#CC0000]/30' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{c.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a2e]">{c.label}</p>
                    <p className="text-xs font-mono text-[#6b7280]">{c.number}</p>
                  </div>
                </div>
                <span className="text-[#CC0000] text-sm font-bold">Call →</span>
              </a>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // Default: emergency type picker
  return (
    <main className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{scrollbarWidth:'none'}}>
      <div className="sticky top-0 z-10 bg-[#CC0000] border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-white/70 hover:text-white text-sm">← Back</Link>
          <div className="w-px h-5 bg-white/20" />
          <h1 className="font-bold text-[#CC0000]">🚨 Emergency</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
          <p className="text-sm text-[#6b7280] leading-relaxed">
            This screen provides emergency navigation assistance. Tap an emergency type to activate re-routing and see the nearest exits and safe areas.
          </p>
        </div>

        <h2 className="font-bold text-[#6b7280] text-sm uppercase tracking-wider">Select Emergency Type</h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            { type: 'fire' as EmergencyType, icon: '🔥', label: 'Fire Alarm', desc: 'Evacuation routes & assembly' },
            { type: 'police' as EmergencyType, icon: '🚓', label: 'Police Incident', desc: 'Lockdown / shelter in place' },
            { type: 'medical' as EmergencyType, icon: '🏥', label: 'Medical', desc: 'AED & first aid locations' },
            { type: 'lockdown' as EmergencyType, icon: '🔒', label: 'Lockdown', desc: 'Secure your location' },
          ].map(({ type, icon, label, desc }) => (
            <button
              key={type!}
              onClick={() => { setActiveEmergency(type); setTimeElapsed(0) }}
              className="bg-white rounded-2xl p-4 text-left hover:bg-red-50 transition-all active:scale-[0.97] border border-gray-100 hover:border-[#CC0000]/30 shadow-sm"
            >
              <span className="text-3xl block mb-2">{icon}</span>
              <h3 className="font-bold text-sm text-[#1a1a2e]">{label}</h3>
              <p className="text-xs text-[#6b7280] mt-1">{desc}</p>
            </button>
          ))}
        </div>

        {/* Always-visible contacts */}
        <h2 className="font-bold text-[#6b7280] text-sm uppercase tracking-wider mt-2">Emergency Contacts</h2>
        <div className="space-y-2">
          {EMERGENCY_CONTACTS.slice(0,3).map(c => (
            <a
              key={c.number}
              href={`tel:${c.number}`}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#1a1a2e]">{c.label}</p>
                  <p className="text-xs font-mono text-[#6b7280]">{c.number}</p>
                </div>
              </div>
              <span className="text-[#CC0000] text-sm font-bold">Call →</span>
            </a>
          ))}
        </div>

        {/* Assembly points map */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h2 className="font-bold mb-3 text-sm text-[#1a1a2e]">Assembly Points</h2>
          <svg viewBox="0 0 400 200" className="w-full rounded-xl overflow-hidden bg-[#F7F8FA]">
            <rect x={10} y={10} width={380} height={180} rx={8} fill="none" stroke="#e5e7eb" strokeWidth={1.5} />
            <rect x={30} y={40} width={80} height={50} rx={4} fill="#003057" fillOpacity={0.15} stroke="#003057" strokeOpacity={0.3} strokeWidth={1} />
            <text x={70} y={68} textAnchor="middle" fill="#003057" fillOpacity={0.8} fontSize={9} fontWeight="600">Trent</text>
            <rect x={150} y={40} width={100} height={60} rx={4} fill="#CC0000" fillOpacity={0.1} stroke="#CC0000" strokeOpacity={0.3} strokeWidth={1} />
            <text x={200} y={73} textAnchor="middle" fill="#CC0000" fillOpacity={0.8} fontSize={9} fontWeight="600">Grove</text>
            <rect x={280} y={50} width={80} height={40} rx={4} fill="#003057" fillOpacity={0.1} stroke="#003057" strokeOpacity={0.3} strokeWidth={1} />
            <text x={320} y={73} textAnchor="middle" fill="#003057" fillOpacity={0.8} fontSize={9} fontWeight="600">Library</text>
            {[{ x: 70, y: 160, label: 'AP1' }, { x: 200, y: 165, label: 'AP2' }, { x: 330, y: 160, label: 'AP3' }].map(ap => (
              <g key={ap.label}>
                <circle cx={ap.x} cy={ap.y} r={12} fill="#16a34a" />
                <text x={ap.x} y={ap.y + 4} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{ap.label}</text>
              </g>
            ))}
            <path d="M70 90 L70 148" stroke="#16a34a" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4,3" />
            <path d="M200 100 L200 153" stroke="#16a34a" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4,3" />
            <path d="M320 90 L330 148" stroke="#16a34a" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4,3" />
            <text x={200} y={190} textAnchor="middle" fill="#9ca3af" fontSize={8}>AP = Assembly Point</text>
          </svg>
        </div>
      </div>
    </main>
  )
}
