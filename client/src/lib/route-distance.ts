/**
 * Calculate the shortest distance from a point to a line segment
 * Uses perpendicular distance formula
 * Returns distance in miles
 */
export function distanceFromPointToRoute(
  pointLat: number,
  pointLng: number,
  routeStartLat: number,
  routeStartLng: number,
  routeEndLat: number,
  routeEndLng: number
): number {
  const R = 3959; // Earth's radius in miles

  const lat1 = (routeStartLat * Math.PI) / 180;
  const lng1 = (routeStartLng * Math.PI) / 180;
  const lat2 = (routeEndLat * Math.PI) / 180;
  const lng2 = (routeEndLng * Math.PI) / 180;
  const lat3 = (pointLat * Math.PI) / 180;
  const lng3 = (pointLng * Math.PI) / 180;

  // Calculate angular distance between start and end points
  const dLng21 = lng2 - lng1;
  const dLat21 = lat2 - lat1;
  const a = Math.sin(dLat21 / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng21 / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d13 = c * R;

  if (d13 === 0) {
    // Start and end points are the same, use direct distance
    const dLat = lat3 - lat1;
    const dLng = lng3 - lng1;
    const a2 = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat3) * Math.sin(dLng / 2) ** 2;
    const c2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
    return c2 * R;
  }

  // Calculate bearing from start to end
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  const bearing = Math.atan2(y, x);

  // Calculate bearing from start to point
  const dLng31 = lng3 - lng1;
  const y2 = Math.sin(dLng31) * Math.cos(lat3);
  const x2 = Math.cos(lat1) * Math.sin(lat3) - Math.sin(lat1) * Math.cos(lat3) * Math.cos(dLng31);
  const bearing2 = Math.atan2(y2, x2);

  // Calculate cross-track distance
  const dxt = Math.asin(Math.sin(bearing2 - bearing) * Math.sin(d13 / R)) * R;

  return Math.abs(dxt);
}

/**
 * Convert miles to feet
 */
export function milesToFeet(miles: number): number {
  return miles * 5280;
}

/**
 * Check if current position is off-route
 * Returns true if distance from route > 1000 feet
 */
export function isOffRoute(
  currentLat: number,
  currentLng: number,
  routeStartLat: number,
  routeStartLng: number,
  routeEndLat: number,
  routeEndLng: number
): boolean {
  const distanceMiles = distanceFromPointToRoute(
    currentLat,
    currentLng,
    routeStartLat,
    routeStartLng,
    routeEndLat,
    routeEndLng
  );

  const distanceFeet = milesToFeet(distanceMiles);
  return distanceFeet > 1000;
}
