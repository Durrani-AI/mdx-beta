// Campus rooms and spaces data for Middlesex University

export type RoomType = 'lecture' | 'lab' | 'seminar' | 'study' | 'canteen' | 'office' | 'toilet' | 'entrance' | 'elevator' | 'stairs' | 'library'

export interface Room {
  id: string
  name: string
  building: string
  floor: number
  type: RoomType
  capacity: number
  accessible: boolean // step-free access
  hasElevator: boolean
  description: string
  coords: { x: number; y: number } // position on SVG map
  features: string[]
}

export interface Building {
  id: string
  name: string
  shortName: string
  floors: number
  color: string
  coords: { x: number; y: number; w: number; h: number }
}

export const BUILDINGS: Building[] = [
  {
    id: 'trent',
    name: 'College Building',
    shortName: 'College',
    floors: 4,
    color: '#CC0000',
    coords: { x: 158, y: 222, w: 88, h: 90 },
  },
  {
    id: 'grove',
    name: 'Grove Building',
    shortName: 'Grove',
    floors: 4,
    color: '#CC0000',
    coords: { x: 18, y: 108, w: 72, h: 88 },
  },
  {
    id: 'cat',
    name: 'MDX House',
    shortName: 'MDX House',
    floors: 3,
    color: '#CC0000',
    coords: { x: 158, y: 68, w: 82, h: 58 },
  },
  {
    id: 'sheppard',
    name: 'Sheppard Library',
    shortName: 'Library',
    floors: 2,
    color: '#CC0000',
    coords: { x: 218, y: 158, w: 112, h: 52 },
  },
  {
    id: 'quad',
    name: 'Hatchcroft Building',
    shortName: 'Hatchcroft',
    floors: 3,
    color: '#CC0000',
    coords: { x: 105, y: 215, w: 56, h: 72 },
  },
  {
    id: 'sports',
    name: 'Williams Building',
    shortName: 'Williams',
    floors: 2,
    color: '#CC0000',
    coords: { x: 298, y: 248, w: 56, h: 62 },
  },
]

export const ROOMS: Room[] = [
  // Trent Building
  { id: 'TR-G01', name: 'TR-G01 Lecture Hall A', building: 'trent', floor: 0, type: 'lecture', capacity: 120, accessible: true, hasElevator: true, description: 'Large lecture hall with AV equipment', coords: { x: 100, y: 120 }, features: ['projector', 'microphone', 'recording'] },
  { id: 'TR-G02', name: 'TR-G02 Lecture Hall B', building: 'trent', floor: 0, type: 'lecture', capacity: 80, accessible: true, hasElevator: true, description: 'Medium lecture hall', coords: { x: 150, y: 120 }, features: ['projector', 'whiteboard'] },
  { id: 'TR-101', name: 'TR-101 Seminar Room', building: 'trent', floor: 1, type: 'seminar', capacity: 30, accessible: true, hasElevator: true, description: 'Seminar room with round table', coords: { x: 100, y: 90 }, features: ['whiteboard', 'tv-screen'] },
  { id: 'TR-102', name: 'TR-102 CS Lab', building: 'trent', floor: 1, type: 'lab', capacity: 25, accessible: true, hasElevator: true, description: 'Computer Science programming lab', coords: { x: 145, y: 90 }, features: ['computers', 'dual-monitors'] },
  { id: 'TR-201', name: 'TR-201 Study Pod', building: 'trent', floor: 2, type: 'study', capacity: 8, accessible: true, hasElevator: true, description: 'Quiet study pod', coords: { x: 100, y: 95 }, features: ['quiet', 'power-outlets'] },
  { id: 'TR-202', name: 'TR-202 Network Lab', building: 'trent', floor: 2, type: 'lab', capacity: 20, accessible: true, hasElevator: true, description: 'Networking & infrastructure lab', coords: { x: 150, y: 95 }, features: ['cisco-equipment', 'servers'] },

  // Grove Building
  { id: 'GR-G01', name: 'GR-G01 Main Reception', building: 'grove', floor: 0, type: 'entrance', capacity: 0, accessible: true, hasElevator: true, description: 'Main reception and info desk', coords: { x: 370, y: 190 }, features: ['info-desk', 'help-point'] },
  { id: 'GR-G02', name: 'GR-G02 Town Hall', building: 'grove', floor: 0, type: 'lecture', capacity: 200, accessible: true, hasElevator: true, description: 'Largest auditorium on campus', coords: { x: 400, y: 120 }, features: ['stage', 'projector', 'PA-system', 'recording'] },
  { id: 'GR-101', name: 'GR-101 Innovation Lab', building: 'grove', floor: 1, type: 'lab', capacity: 40, accessible: true, hasElevator: true, description: 'Maker space & innovation hub', coords: { x: 370, y: 110 }, features: ['3d-printer', 'soldering', 'robotics'] },
  { id: 'GR-102', name: 'GR-102 Seminar', building: 'grove', floor: 1, type: 'seminar', capacity: 25, accessible: true, hasElevator: true, description: 'Seminar room with glass partition', coords: { x: 420, y: 110 }, features: ['whiteboard', 'video-call'] },
  { id: 'GR-201', name: 'GR-201 Data Science Lab', building: 'grove', floor: 2, type: 'lab', capacity: 30, accessible: true, hasElevator: true, description: 'High-spec workstations for ML/AI', coords: { x: 370, y: 100 }, features: ['GPU-workstations', 'dual-monitors', 'big-data'] },
  { id: 'GR-CAFE', name: 'Grove Café', building: 'grove', floor: 0, type: 'canteen', capacity: 80, accessible: true, hasElevator: false, description: 'Main campus café and social space', coords: { x: 450, y: 190 }, features: ['hot-food', 'coffee', 'seating'] },

  // Sheppard Library
  { id: 'LIB-G01', name: 'Library Ground Floor', building: 'sheppard', floor: 0, type: 'library', capacity: 150, accessible: true, hasElevator: true, description: 'Open access library floor', coords: { x: 260, y: 300 }, features: ['books', 'computers', 'quiet-zones', 'printing'] },
  { id: 'LIB-101', name: 'Library Study Zone', building: 'sheppard', floor: 1, type: 'study', capacity: 60, accessible: true, hasElevator: true, description: 'Upper floor silent study area', coords: { x: 255, y: 280 }, features: ['silent', 'pods', 'power-outlets', 'lockers'] },
  { id: 'LIB-COLLAB', name: 'Collaborative Study Room', building: 'sheppard', floor: 0, type: 'study', capacity: 20, accessible: true, hasElevator: false, description: 'Bookable group study room', coords: { x: 215, y: 295 }, features: ['whiteboard', 'screen-sharing', 'bookable'] },

  // Sports Centre
  { id: 'SP-GYM', name: 'Sports Gym', building: 'sports', floor: 0, type: 'study', capacity: 50, accessible: true, hasElevator: false, description: 'Fully equipped gym', coords: { x: 610, y: 270 }, features: ['equipment', 'changing-rooms'] },

  // Outdoor / Quad
  { id: 'QD-MAIN', name: 'Main Quad', building: 'quad', floor: 0, type: 'study', capacity: 200, accessible: true, hasElevator: false, description: 'Central outdoor courtyard', coords: { x: 440, y: 295 }, features: ['outdoor', 'seating', 'wifi'] },
]


