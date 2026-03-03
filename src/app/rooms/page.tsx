'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ROOMS, Room, RoomType } from '@/data/rooms'
import { ALL_BOOKINGS, DAYS, getFreeRooms } from '@/data/timetable'

const TYPE_ICONS: Record<string, string> = {
  lecture: '🎓', lab: '💻', seminar: '🗣️', study: '📚', canteen: '☕',
  office: '🏢', toilet: '🚻', entrance: '🚪', elevator: '🛗', stairs: '🪜',
  library: '📖',
}

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture Hall', lab: 'Computer Lab', seminar: 'Seminar Room',
  study: 'Study Space', canteen: 'Café/Canteen', office: 'Office',
  library: 'Library',
}

export default function RoomsPage() {
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 0 : Math.min(new Date().getDay() - 1, 4)
  )
  const [selectedHour, setSelectedHour] = useState(new Date().getHours())
  const [filterType, setFilterType] = useState<RoomType | 'all'>('all')
  const [accessibleOnly, setAccessibleOnly] = useState(false)
  const [search, setSearch] = useState('')

  const freeRoomIds = getFreeRooms(selectedDay, selectedHour)

  const filteredRooms = ROOMS.filter(room => {
    const isFree = freeRoomIds.includes(room.id)
    const matchType = filterType === 'all' || room.type === filterType
    const matchAccess = !accessibleOnly || room.accessible
    const matchSearch = room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.id.toLowerCase().includes(search.toLowerCase())
    return isFree && matchType && matchAccess && matchSearch
  })

  const getNextFreeAt = (roomId: string, day: number, hour: number): string => {
    for (let h = hour; h <= 22; h++) {
      const free = getFreeRooms(day, h).includes(roomId)
      if (free && h > hour) return `Free from ${h}:00`
    }
    return 'Check tomorrow'
  }

  const getOccupiedUntil = (roomId: string, day: number, hour: number): string => {
    const booking = ALL_BOOKINGS.find(b =>
      b.roomId === roomId && b.day === day && b.startHour <= hour && b.endHour > hour
    )
    if (!booking) return ''
    return `${booking.module} until ${booking.endHour}:00`
  }

  const types: Array<RoomType | 'all'> = ['all', 'study', 'lab', 'seminar', 'library', 'lecture']

  return (
    <main className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{scrollbarWidth:'none'}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#CC0000] border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-white/70 hover:text-white text-sm">← Back</Link>
          <div className="w-px h-5 bg-white/20" />
          <h1 className="font-bold text-white text-sm">🏫 Find a Room</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-sm text-[#6b7280]">When do you need a room?</h2>

          {/* Day picker */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setSelectedDay(i)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedDay === i ? 'bg-[#CC0000] text-white' : 'bg-gray-100 text-[#6b7280] hover:bg-gray-200'}`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Hour slider */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-[#6b7280]">Time</span>
              <span className="text-sm font-mono font-bold text-[#CC0000]">{String(selectedHour).padStart(2, '0')}:00</span>
            </div>
            <input
              type="range" min={8} max={21}
              value={selectedHour}
              onChange={e => setSelectedHour(Number(e.target.value))}
              className="w-full accent-[#CC0000]"
            />
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search room name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#CC0000]"
          />

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterType === t ? 'bg-[#CC0000] text-white' : 'bg-gray-100 text-[#6b7280] hover:bg-gray-200'}`}
              >
                {t === 'all' ? 'All Types' : `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}
              </button>
            ))}
          </div>

          {/* Accessible toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6b7280]">♿ Accessible only</span>
            <button
              onClick={() => setAccessibleOnly(a => !a)}
              className={`w-10 h-5 rounded-full transition-colors relative ${accessibleOnly ? 'bg-[#CC0000]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${accessibleOnly ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#1a1a2e]">{filteredRooms.length} free rooms available</h2>
          <span className="text-xs text-[#6b7280]">{DAYS[selectedDay]} {String(selectedHour).padStart(2, '0')}:00</span>
        </div>

        {filteredRooms.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-4xl mb-3">😔</p>
            <p className="font-medium text-[#1a1a2e]">No free rooms match your filters</p>
            <p className="text-[#6b7280] text-sm mt-1">Try a different time or remove filters</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredRooms.map(room => (
            <div key={room.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#F7F8FA] border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {TYPE_ICONS[room.type] ?? '🏠'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm leading-tight text-[#1a1a2e]">{room.name}</h3>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      Floor {room.floor} · Cap. {room.capacity}
                      {room.accessible && ' · ♿'}
                      {room.hasElevator && ' · 🛗'}
                    </p>
                    <p className="text-xs text-[#6b7280] mt-0.5 truncate">{room.description}</p>
                  </div>
                </div>
                <Link
                  href={`/navigate`}
                  className="flex-shrink-0 ml-2 bg-[#CC0000] hover:bg-[#a80000] text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-colors"
                >
                  Go
                </Link>
              </div>

              {room.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {room.features.map(f => (
                    <span key={f} className="text-xs bg-gray-50 border border-gray-100 rounded-md px-2 py-0.5 text-[#6b7280]">
                      {f.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 bg-green-50 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-green-700 font-medium">✓ Free now</span>
                <span className="text-xs text-[#6b7280]">
                  {getNextFreeAt(room.id, selectedDay, selectedHour + 1) !== 'Check tomorrow'
                    ? `Next booking: ${getOccupiedUntil(room.id, selectedDay, selectedHour + 1) || 'later'}`
                    : 'Free all day'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* All occupied rooms */}
        <details className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <summary className="px-4 py-3 cursor-pointer text-sm text-[#6b7280] hover:text-[#1a1a2e] select-none">
            Show occupied rooms ({ROOMS.length - filteredRooms.length})
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {ROOMS.filter(r => !freeRoomIds.includes(r.id)).map(room => (
              <div key={room.id} className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a2e]">{room.name}</p>
                    <p className="text-xs text-[#CC0000]">{getOccupiedUntil(room.id, selectedDay, selectedHour)}</p>
                  </div>
                  <span className="text-xs text-[#CC0000] font-medium">Occupied</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </main>
  )
}
