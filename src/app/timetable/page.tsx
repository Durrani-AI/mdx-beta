'use client'
import { useState } from 'react'
import Link from 'next/link'
import { DEMO_USER_TIMETABLE, ALL_BOOKINGS, DAYS, TODAY_DAY, Booking } from '@/data/timetable'
import { ROOMS } from '@/data/rooms'

const TYPE_COLOURS: Record<string, string> = {
  lecture: '#003057',
  lab: '#CC0000',
  seminar: '#1a3a5c',
  workshop: '#16a34a',
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 08-21

export default function TimetablePage() {
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY)
  const [view, setView] = useState<'day' | 'week'>('week')
  const userBookings = DEMO_USER_TIMETABLE.bookings

  const getDayBookings = (day: number) =>
    userBookings.filter(b => b.day === day).sort((a, b) => a.startHour - b.startHour)

  const getRoom = (id: string) => ROOMS.find(r => r.id === id)

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const room = getRoom(booking.roomId)
    const duration = booking.endHour - booking.startHour
    return (
      <div
        className="bg-white rounded-xl p-3 border relative overflow-hidden shadow-sm"
        style={{ borderColor: TYPE_COLOURS[booking.type] + '44' }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: TYPE_COLOURS[booking.type] }} />
        <div className="pl-1">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-2">
              <p className="font-bold text-sm leading-tight text-[#1a1a2e]">{booking.module}</p>
              <p className="text-xs font-mono text-[#6b7280]">{booking.moduleCode}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-[#6b7280] capitalize flex-shrink-0">
              {booking.type}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
            <span>🕐 {booking.startHour}:00 – {booking.endHour}:00 ({duration}h)</span>
            <span>📍 {room?.name ?? booking.roomId}</span>
            <span>👤 {booking.lecturer}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <Link
              href={`/navigate`}
              className="text-xs bg-[#CC0000] hover:bg-[#a80000] text-white px-3 py-1 rounded-lg transition-colors font-medium"
            >
              🧭 Navigate there
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{scrollbarWidth:'none'}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#CC0000] border-b border-white/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/70 hover:text-white text-sm">← Back</Link>
            <div className="w-px h-5 bg-white/20" />
            <h1 className="font-bold text-white text-sm">📅 Timetable</h1>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            <button onClick={() => setView('day')} className={`px-3 py-1.5 text-xs font-medium ${view === 'day' ? 'bg-[#CC0000] text-white' : 'text-white/60'}`}>Day</button>
            <button onClick={() => setView('week')} className={`px-3 py-1.5 text-xs font-medium ${view === 'week' ? 'bg-[#CC0000] text-white' : 'text-white/60'}`}>Week</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Student info */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#CC0000] to-[#003057] flex items-center justify-center font-bold text-lg text-white">
            {DEMO_USER_TIMETABLE.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h2 className="font-bold text-[#1a1a2e]">{DEMO_USER_TIMETABLE.name}</h2>
            <p className="text-sm text-[#6b7280]">{DEMO_USER_TIMETABLE.programme} · Year {DEMO_USER_TIMETABLE.year}</p>
            <p className="text-xs text-[#6b7280] font-mono">{DEMO_USER_TIMETABLE.studentId}</p>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DAYS.map((d, i) => {
            const count = getDayBookings(i).length
            const isToday = i === TODAY_DAY
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(i)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors min-w-[56px] ${
                  selectedDay === i ? 'bg-[#CC0000] text-white' :
                  isToday ? 'bg-[#CC0000]/10 text-[#CC0000]' : 'bg-white text-[#6b7280] border border-gray-100'
                }`}
              >
                <span>{d.slice(0, 3)}</span>
                {count > 0 && <span className={`mt-1 w-1.5 h-1.5 rounded-full ${selectedDay === i ? 'bg-white' : 'bg-[#CC0000]'}`} />}
              </button>
            )
          })}
        </div>

        {/* Day view */}
        {view === 'day' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#1a1a2e]">{DAYS[selectedDay]}</h3>
              <span className="text-xs text-[#6b7280]">{getDayBookings(selectedDay).length} class{getDayBookings(selectedDay).length !== 1 ? 'es' : ''}</span>
            </div>
            {getDayBookings(selectedDay).length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-medium text-[#1a1a2e]">No classes today</p>
                <Link href="/rooms" className="text-sm text-[#CC0000] hover:underline mt-2 inline-block">Find a study space →</Link>
              </div>
            ) : (
              getDayBookings(selectedDay).map(b => <BookingCard key={b.id} booking={b} />)
            )}
          </div>
        )}

        {/* Week view */}
        {view === 'week' && (
          <div className="space-y-4">
            {DAYS.map((day, i) => {
              const bookings = getDayBookings(i)
              return (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`text-sm font-semibold ${i === TODAY_DAY ? 'text-[#CC0000]' : 'text-[#6b7280]'}`}>{day}</h3>
                    {i === TODAY_DAY && <span className="text-xs bg-[#CC0000]/10 text-[#CC0000] px-2 py-0.5 rounded-full">Today</span>}
                  </div>
                  {bookings.length === 0 ? (
                    <div className="bg-white rounded-xl px-4 py-3 text-sm text-[#6b7280] border border-gray-100">No classes</div>
                  ) : (
                    <div className="space-y-2">
                      {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Visual timeline */}
        {view === 'day' && getDayBookings(selectedDay).length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold mb-3 text-[#6b7280]">Day Timeline</h3>
            <div className="relative">
              <div className="absolute left-10 top-0 bottom-0 w-px bg-gray-200" />
              {HOURS.map(h => {
                const booking = getDayBookings(selectedDay).find(b => b.startHour === h)
                return (
                  <div key={h} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-[#6b7280] w-10 text-right font-mono">{String(h).padStart(2,'0')}</span>
                    <div className="flex-1 h-6 relative">
                      {booking && (
                        <div
                          className="absolute inset-y-0 left-0 right-0 rounded flex items-center px-2"
                          style={{ backgroundColor: TYPE_COLOURS[booking.type] + '99' }}
                        >
                          <span className="text-xs font-medium truncate">{booking.module}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Smart next-class alert */}
        {(() => {
          const now = new Date().getHours()
          const nextInDay = getDayBookings(selectedDay).find(b => b.startHour > now && selectedDay === TODAY_DAY)
          if (!nextInDay) return null
          const minsUntil = (nextInDay.startHour - now) * 60
          if (minsUntil > 120) return null
          return (
            <div className="bg-red-50 border border-[#CC0000]/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#CC0000] text-sm">⏰ Class in {minsUntil} minutes!</p>
                <p className="text-sm mt-1 text-[#1a1a2e]">{nextInDay.module} at {nextInDay.startHour}:00</p>
              </div>
              <Link
                href={`/navigate`}
                className="bg-[#CC0000] text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Go Now
              </Link>
            </div>
          )
        })()}
      </div>
    </main>
  )
}
