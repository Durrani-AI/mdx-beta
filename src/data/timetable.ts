// Timetable data — simulates real timetable feed
// In production this would be fetched from Middlesex's timetabling API

export interface Booking {
  id: string
  roomId: string
  module: string
  moduleCode: string
  lecturer: string
  day: number        // 0=Mon … 4=Fri
  startHour: number  // 24hr
  endHour: number
  type: 'lecture' | 'lab' | 'seminar' | 'workshop'
  studentGroups: string[]
}

export interface UserTimetable {
  studentId: string
  name: string
  programme: string
  year: number
  bookings: Booking[]
}

export const ALL_BOOKINGS: Booking[] = [
  // Monday
  { id: 'b1',  roomId: 'TR-G01', module: 'Software Engineering', moduleCode: 'CST3050', lecturer: 'Dr. Ahmed', day: 0, startHour: 9,  endHour: 11, type: 'lecture',  studentGroups: ['CS-Y3-A', 'CS-Y3-B'] },
  { id: 'b2',  roomId: 'TR-102', module: 'Web Development',       moduleCode: 'CST2040', lecturer: 'Dr. Patel',  day: 0, startHour: 11, endHour: 13, type: 'lab',     studentGroups: ['CS-Y2-A'] },
  { id: 'b3',  roomId: 'GR-201', module: 'Machine Learning',      moduleCode: 'CST3070', lecturer: 'Prof. Singh', day: 0, startHour: 13, endHour: 15, type: 'lecture', studentGroups: ['CS-Y3-A'] },
  { id: 'b4',  roomId: 'GR-101', module: 'Innovation Workshop',   moduleCode: 'CST2010', lecturer: 'Dr. Chen',   day: 0, startHour: 14, endHour: 17, type: 'workshop', studentGroups: ['CS-Y2-B'] },
  { id: 'b5',  roomId: 'TR-101', module: 'Databases',             moduleCode: 'CST2020', lecturer: 'Dr. Brown',  day: 0, startHour: 9,  endHour: 10, type: 'seminar',  studentGroups: ['CS-Y2-C'] },

  // Tuesday
  { id: 'b6',  roomId: 'GR-G02', module: 'Computer Architecture', moduleCode: 'CST1010', lecturer: 'Prof. Lee',  day: 1, startHour: 10, endHour: 12, type: 'lecture',  studentGroups: ['CS-Y1-A', 'CS-Y1-B'] },
  { id: 'b7',  roomId: 'TR-202', module: 'Networks & Security',   moduleCode: 'CST3010', lecturer: 'Dr. Omar',   day: 1, startHour: 9,  endHour: 11, type: 'lab',     studentGroups: ['CS-Y3-B'] },
  { id: 'b8',  roomId: 'GR-102', module: 'Project Management',    moduleCode: 'CST2030', lecturer: 'Ms. Taylor', day: 1, startHour: 13, endHour: 14, type: 'seminar',  studentGroups: ['CS-Y2-A', 'CS-Y2-B'] },
  { id: 'b9',  roomId: 'TR-G02', module: 'Algorithms',            moduleCode: 'CST1020', lecturer: 'Dr. Kim',    day: 1, startHour: 14, endHour: 16, type: 'lecture',  studentGroups: ['CS-Y1-A'] },

  // Wednesday
  { id: 'b10', roomId: 'TR-G01', module: 'Operating Systems',     moduleCode: 'CST2060', lecturer: 'Prof. Davis', day: 2, startHour: 9,  endHour: 11, type: 'lecture', studentGroups: ['CS-Y2-A', 'CS-Y2-C'] },
  { id: 'b11', roomId: 'GR-201', module: 'Deep Learning',         moduleCode: 'CST3080', lecturer: 'Prof. Singh', day: 2, startHour: 11, endHour: 14, type: 'lab',    studentGroups: ['CS-Y3-A'] },
  { id: 'b12', roomId: 'TR-102', module: 'Mobile Development',    moduleCode: 'CST3020', lecturer: 'Dr. Patel',   day: 2, startHour: 14, endHour: 16, type: 'lab',    studentGroups: ['CS-Y3-B'] },

  // Thursday
  { id: 'b13', roomId: 'GR-G02', module: 'Cloud Computing',       moduleCode: 'CST3040', lecturer: 'Dr. Wilson',  day: 3, startHour: 10, endHour: 12, type: 'lecture', studentGroups: ['CS-Y3-A', 'CS-Y3-B'] },
  { id: 'b14', roomId: 'TR-101', module: 'HCI & UX Design',       moduleCode: 'CST2050', lecturer: 'Ms. Green',   day: 3, startHour: 9,  endHour: 11, type: 'seminar', studentGroups: ['CS-Y2-B'] },
  { id: 'b15', roomId: 'TR-202', module: 'Cybersecurity',         moduleCode: 'CST3010', lecturer: 'Dr. Omar',    day: 3, startHour: 13, endHour: 15, type: 'lab',    studentGroups: ['CS-Y3-B'] },
  { id: 'b16', roomId: 'GR-101', module: 'IoT Systems',           moduleCode: 'CST3060', lecturer: 'Dr. Chen',    day: 3, startHour: 14, endHour: 17, type: 'workshop', studentGroups: ['CS-Y3-A'] },

  // Friday
  { id: 'b17', roomId: 'TR-G01', module: 'Data Structures',       moduleCode: 'CST1030', lecturer: 'Dr. Kim',     day: 4, startHour: 9,  endHour: 11, type: 'lecture', studentGroups: ['CS-Y1-A', 'CS-Y1-B'] },
  { id: 'b18', roomId: 'GR-102', module: 'Ethics in Computing',   moduleCode: 'CST2070', lecturer: 'Dr. Brown',   day: 4, startHour: 11, endHour: 12, type: 'seminar', studentGroups: ['CS-Y2-A', 'CS-Y2-B', 'CS-Y2-C'] },
]

export const DEMO_USER_TIMETABLE: UserTimetable = {
  studentId: 'M00000001',
  name: 'Alex Johnson',
  programme: 'BSc Computer Science',
  year: 3,
  bookings: ALL_BOOKINGS.filter(b => b.studentGroups.includes('CS-Y3-A')),
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export const TODAY_DAY = new Date().getDay() === 0 ? 0 : (new Date().getDay() - 1) % 5 // Mon=0

/**
 * Returns all rooms that are FREE at the given day + hour
 */
export function getFreeRooms(day: number, hour: number): string[] {
  const busyRooms = ALL_BOOKINGS
    .filter(b => b.day === day && b.startHour <= hour && b.endHour > hour)
    .map(b => b.roomId)
  
  const allBookableRooms = [...new Set(ALL_BOOKINGS.map(b => b.roomId))]
  return allBookableRooms.filter(r => !busyRooms.includes(r))
}

/**
 * Get next class for the demo user
 */
export function getNextClass(day: number, currentHour: number): Booking | undefined {
  return DEMO_USER_TIMETABLE.bookings
    .filter(b => b.day === day && b.startHour > currentHour)
    .sort((a, b) => a.startHour - b.startHour)[0]
}
