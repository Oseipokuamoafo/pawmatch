import { prisma } from "@/lib/prisma";

const EARTH_RADIUS_KM = 6371;

/* ─── Pure math: Haversine distance ──────────────────────────────────── */

/**
 * Great-circle distance between two coordinates, in kilometres.
 *
 * The same formula used by the Postgres raw query below — kept identical
 * so client-side hints (e.g. "12 km away") match server-side filtering.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── DB query: users within radius ─────────────────────────────────── */

export interface NearbyUser {
  id: string;
  /** Distance from the origin, in kilometres. */
  distanceKm: number;
}

/**
 * Returns user IDs whose stored lat/lng falls within `radiusKm` of the
 * (lat, lng) origin, ordered by ascending distance.
 *
 * Implementation: parameterised raw SQL with Haversine in WHERE + SELECT.
 * This intentionally does not require PostGIS — once the extension is
 * enabled, a follow-up version can use ST_DWithin on a geography column
 * and a GIST index for sub-millisecond queries at scale.
 *
 * Per CLAUDE.md privacy rules, the User table already stores ROUNDED
 * lat/lng (never exact coordinates), so this helper inherits that
 * privacy guarantee.
 */
export async function findUsersWithinRadius(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<NearbyUser[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) {
    return [];
  }
  if (radiusKm <= 0) return [];

  // $1 = origin lat, $2 = origin lng, $3 = radius km, $4 = earth radius km
  const rows = await prisma.$queryRaw<{ id: string; distance_km: number }[]>`
    SELECT
      "id",
      ${EARTH_RADIUS_KM} * 2 * asin(sqrt(
        power(sin(radians(${lat} - "locationLat") / 2), 2)
        + cos(radians("locationLat"))
        * cos(radians(${lat}))
        * power(sin(radians(${lng} - "locationLng") / 2), 2)
      )) AS distance_km
    FROM "User"
    WHERE "locationLat" IS NOT NULL
      AND "locationLng" IS NOT NULL
      AND ${EARTH_RADIUS_KM} * 2 * asin(sqrt(
        power(sin(radians(${lat} - "locationLat") / 2), 2)
        + cos(radians("locationLat"))
        * cos(radians(${lat}))
        * power(sin(radians(${lng} - "locationLng") / 2), 2)
      )) <= ${radiusKm}
    ORDER BY distance_km ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    distanceKm: Number(r.distance_km),
  }));
}
