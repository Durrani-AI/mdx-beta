/**
 * Traffic level based on time-of-day heuristic
 * Simulates crowd density — in production this would use real sensor data / ML model
 */
export function getTrafficLevel(hour: number): 'low' | 'medium' | 'high' {
  // Peak times: 9-10, 12-13, 14-15
  if ((hour >= 9 && hour < 10) || (hour >= 12 && hour < 13) || (hour >= 14 && hour < 15)) {
    return 'high'
  }
  if ((hour >= 10 && hour < 12) || (hour >= 13 && hour < 14) || (hour >= 15 && hour < 17)) {
    return 'medium'
  }
  return 'low'
}

/**
 * Simulated ML crowd prediction for next hour
 * Returns crowd score 0-100 for each zone
 */
export function predictCrowdHeatmap(currentHour: number): Record<string, number> {
  const base: Record<string, number> = {
    'GR-G01': 20, 'GR-CAFE': 30, 'QD-MAIN': 25, 'TR-G01': 15, 'LIB-G01': 20,
    'ENTRANCE_MAIN': 10, 'GR-101': 10, 'GR-201': 10, 'TR-102': 10, 'LIB-101': 25,
  }
  // Simulate peaks
  const hour = (currentHour + 1) % 24
  if (hour === 9) {
    base['ENTRANCE_MAIN'] = 90; base['GR-G01'] = 80; base['TR-G01'] = 75
  } else if (hour === 12) {
    base['GR-CAFE'] = 95; base['QD-MAIN'] = 85; base['LIB-G01'] = 60
  } else if (hour === 14) {
    base['TR-G01'] = 85; base['GR-G02'] = 80; base['GR-201'] = 70
  }

  // Add random noise ±10
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, Math.min(100, Math.max(0, v + (Math.random() * 20 - 10)))])
  )
}
