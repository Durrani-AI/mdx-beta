'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DEMO_USER_TIMETABLE, DAYS, getNextClass, TODAY_DAY, getFreeRooms } from '@/data/timetable'
import { getTrafficLevel } from '@/lib/pathfinding'
import { ROOMS } from '@/data/rooms'
import { AttendanceScan } from './navigate/AttendanceScan'

export default function Home() {
  const [currentHour, setCurrentHour] = useState(new Date().getHours())
  const [currentTime, setCurrentTime] = useState('')
  const [emergency, setEmergency] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentHour(now.getHours())
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  const nextClass = getNextClass(TODAY_DAY, currentHour)
  const nextClassRoom = nextClass ? ROOMS.find(r => r.id === nextClass.roomId) : null
  const trafficNow = getTrafficLevel(currentHour)
  const freeNow = getFreeRooms(TODAY_DAY, currentHour)

  const trafficColour = { low: '#16a34a', medium: '#d97706', high: '#CC0000' }[trafficNow]
  const trafficLabel  = { low: 'Low Traffic', medium: 'Moderate', high: 'Busy Campus' }[trafficNow]
  const trafficBg     = { low: '#dcfce7', medium: '#fef3c7', high: '#fee2e2' }[trafficNow]

  return (
    <main className="relative h-full flex flex-col bg-[#F7F8FA] text-[#1a1a2e] overflow-hidden">

      {/* Attendance Scan overlay — covers exactly the phone frame height */}
      {showAttendance && (
        <div className="absolute inset-0 z-50 overflow-hidden">
          <AttendanceScan onDone={() => setShowAttendance(false)} />
        </div>
      )}
      {/* Emergency Banner */}
      {emergency && (
        <div className="bg-[#CC0000] text-white text-center py-3 px-4 font-bold text-sm z-50 sticky top-0 flex items-center justify-center gap-3">
          <span className="animate-pulse">🚨</span>
          FIRE ALARM — Follow emergency routes.
          <Link href="/emergency" className="underline ml-2">View Map</Link>
          <button onClick={() => setEmergency(false)} className="ml-4 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Scrollable content — flex-1 so it fills remaining height, scrolls internally */}
      <div className="flex-1 overflow-y-auto" style={{scrollbarWidth:'none'}}>
      {/* MDX Header */}
      <header className="bg-[#CC0000] text-white px-5 pt-8 pb-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#a80000] opacity-50" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white opacity-5" />

        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#003057] rounded-xl flex items-center justify-center font-black text-xs tracking-tight">MDX</div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none">Middlesex University</p>
              <h1 className="text-lg font-black leading-tight tracking-tight">Waleed Aamir</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none">{currentTime}</p>
            <p className="text-xs text-white/40 mt-0.5">{DAYS[TODAY_DAY] ?? 'Today'}</p>
          </div>
        </div>

        {/* Next class */}
        {nextClass ? (
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Next Class</p>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base leading-tight">{nextClass.module}</h2>
                <p className="text-white/70 text-xs font-mono mt-0.5">{nextClass.moduleCode}</p>
                <p className="text-white/60 text-xs mt-1">
                  {nextClass.startHour}:00–{nextClass.endHour}:00 · {nextClassRoom?.name ?? nextClass.roomId}
                </p>
              </div>
              <Link
                href="/navigate"
                className="bg-[#003057] hover:bg-[#1a3a5c] text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0"
              >
                Navigate →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-sm text-white/60">No more classes today</p>
            <p className="font-semibold text-sm mt-0.5">{freeNow.length} study spaces available</p>
          </div>
        )}

        {/* Status bar */}
        <div className="flex gap-2 mt-3">
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 flex-1 text-xs font-semibold"
            style={{ backgroundColor: trafficBg + '22', color: trafficColour, border: `1px solid ${trafficColour}33` }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: trafficColour }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: trafficColour }} />
            </span>
            {trafficLabel}
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 flex-1 text-xs font-semibold text-white/80">
            📚 {freeNow.length} Free Rooms
          </div>
          <button
            onClick={() => setEmergency(true)}
            className="bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-white hover:bg-white/30 transition-colors text-sm"
            title="Emergency mode"
          >🚨</button>
        </div>
      </header>

      {/* Feature Grid */}
      <div className="px-4 mt-5 space-y-3">
        {/* AR Navigate — hero card */}
        <Link href="/navigate"
          className="group block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] overflow-hidden relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-[#CC0000] opacity-[0.07] rounded-full translate-x-6 -translate-y-6" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#CC0000] rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md shadow-red-200">
              🧭
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base">AR Navigate</h3>
              <p className="text-[#6b7280] text-xs mt-0.5">Step-by-step visual guidance · Main Gate → CS Lab</p>
            </div>
            <span className="text-[#CC0000] font-bold group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* Attendance — hero card */}
        <button onClick={() => setShowAttendance(true)}
          className="group w-full bg-[#003057] rounded-2xl p-5 shadow-sm border border-[#003057]/20 hover:shadow-md transition-all active:scale-[0.98] overflow-hidden relative text-left">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white opacity-[0.04] rounded-full translate-x-6 -translate-y-6" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
              🎓
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-white">Mark Attendance</h3>
              <p className="text-white/55 text-xs mt-0.5">Scan your face to mark attendance</p>
            </div>
            <span className="text-white/60 font-bold group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/map"
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.97]">
            <div className="w-10 h-10 bg-[#CC0000]/10 rounded-xl flex items-center justify-center text-xl mb-3">🗺️</div>
            <h3 className="font-bold text-sm">Campus Map</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">Live crowd heatmap</p>
          </Link>

          <Link href="/rooms"
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.97]">
            <div className="w-10 h-10 bg-[#CC0000]/10 rounded-xl flex items-center justify-center text-xl mb-3">🏫</div>
            <h3 className="font-bold text-sm">Find a Room</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">Empty spaces now</p>
          </Link>

          <Link href="/timetable"
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.97]">
            <div className="w-10 h-10 bg-[#CC0000]/10 rounded-xl flex items-center justify-center text-xl mb-3">📅</div>
            <h3 className="font-bold text-sm">Timetable</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">Classes + quick nav</p>
          </Link>

          <Link href="/emergency"
            className="bg-white rounded-2xl p-4 shadow-sm border border-red-100 hover:shadow-md transition-all active:scale-[0.97]">
            <div className="w-10 h-10 bg-[#CC0000]/10 rounded-xl flex items-center justify-center text-xl mb-3">🚨</div>
            <h3 className="font-bold text-sm text-[#CC0000]">Emergency</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">Exits &amp; re-routing</p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-[#6b7280] mt-8 mb-10 px-4">
         Middlesex University London · CS Hackathon 2026
      </p>
      </div>
    </main>
  )
}
