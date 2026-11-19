import {
  centroid,
  computeConnectedComponentSize,
  computeTotalOverlap,
  ensureCCW,
  getWorldVertices,
  intersectionArea,
  polygonArea,
  simplifyCollinear,
  unionPolygons,
} from './geometry.ts';
import type {
  Piece,
  Point,
  Polygon,
  PolygonWithHoles,
  SymmetryAxis,
  ValidationResult,
} from './types.ts';

export const SYMMETRY_IOU_THRESHOLD = 0.94;

/** Reflects a point across the line passing through `origin` with direction `angleRad`. */
export function reflectPoint(p: Point, origin: Point, angleRad: number): Point {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const cos2 = Math.cos(2 * angleRad);
  const sin2 = Math.sin(2 * angleRad);
  return {
    x: origin.x + dx * cos2 + dy * sin2,
    y: origin.y + dx * sin2 - dy * cos2,
  };
}

/** Reflects a polygon across the line `(origin, angleRad)` and keeps CCW orientation. */
export function reflectPolygon(poly: Polygon, origin: Point, angleRad: number): Polygon {
  const reflected = poly.map((p) => reflectPoint(p, origin, angleRad));
  return ensureCCW(reflected);
}

/** Computes Intersection-over-Union of two simple polygons. */
export function polygonIoU(polyA: Polygon, polyB: Polygon): number {
  const areaA = polygonArea(polyA);
  const areaB = polygonArea(polyB);
  if (areaA < 1e-4 || areaB < 1e-4) return 0;
  const inter = intersectionArea(polyA, polyB);
  const unionArea = areaA + areaB - inter;
  if (unionArea < 1e-4) return 0;
  return inter / unionArea;
}

/**
 * Computes Intersection-over-Union for a set of non-overlapping hole polygons.
 */
function holeSetIoU(holesA: Polygon[], holesB: Polygon[]): number {
  if (holesA.length === 0 && holesB.length === 0) return 1;
  if (holesA.length !== holesB.length) return 0;

  let areaA = 0;
  let areaB = 0;
  for (const h of holesA) areaA += polygonArea(h);
  for (const h of holesB) areaB += polygonArea(h);

  let interSum = 0;
  for (const ha of holesA) {
    for (const hb of holesB) {
      interSum += intersectionArea(ha, hb);
    }
  }

  const unionArea = areaA + areaB - interSum;
  if (unionArea < 1e-4) return 0;
  return interSum / unionArea;
}

function normalizeAxisAngle(rad: number): number {
  let a = rad % Math.PI;
  if (a < 0) a += Math.PI;
  return a;
}

function shapeCentroid(shape: PolygonWithHoles): Point {
  const outerArea = polygonArea(shape.outer);
  const outerC = centroid(shape.outer);
  if (shape.holes.length === 0) return outerC;

  let netArea = outerArea;
  let wx = outerArea * outerC.x;
  let wy = outerArea * outerC.y;

  for (const hole of shape.holes) {
    const ha = polygonArea(hole);
    const hc = centroid(hole);
    netArea -= ha;
    wx -= ha * hc.x;
    wy -= ha * hc.y;
  }

  if (Math.abs(netArea) < 1e-3) return outerC;
  return { x: wx / netArea, y: wy / netArea };
}

function collectCandidateAngles(poly: Polygon, origin: Point, out: number[]): void {
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const v = poly[i]!;
    const next = poly[(i + 1) % n]!;

    if (Math.hypot(v.x - origin.x, v.y - origin.y) > 1e-3) {
      out.push(normalizeAxisAngle(Math.atan2(v.y - origin.y, v.x - origin.x)));
    }

    const mid = { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
    if (Math.hypot(mid.x - origin.x, mid.y - origin.y) > 1e-3) {
      out.push(normalizeAxisAngle(Math.atan2(mid.y - origin.y, mid.x - origin.x)));
    }

    for (let j = i + 1; j < n; j++) {
      const vj = poly[j]!;
      const dx = vj.x - v.x;
      const dy = vj.y - v.y;
      if (Math.hypot(dx, dy) > 1e-3) {
        out.push(normalizeAxisAngle(Math.atan2(dy, dx) + Math.PI / 2));
        out.push(normalizeAxisAngle(Math.atan2(dy, dx)));
      }
    }
  }
}

/**
 * Searches for a line symmetry axis of an arbitrary simple polygon or PolygonWithHoles.
 * Both the outer boundary and all interior holes must reflect onto themselves along the same axis.
 * Pure point symmetry (180-deg rotational symmetry without reflection symmetry) is rejected.
 */
export function findSymmetryAxis(
  polyOrShape: Polygon | PolygonWithHoles,
  iouThreshold = SYMMETRY_IOU_THRESHOLD,
): { isSymmetric: boolean; axis: SymmetryAxis | null; bestIoU: number } {
  const rawShape: PolygonWithHoles = Array.isArray(polyOrShape)
    ? { outer: polyOrShape, holes: [] }
    : polyOrShape;

  const cleanOuter = simplifyCollinear(rawShape.outer);
  if (cleanOuter.length < 3) {
    return { isSymmetric: false, axis: null, bestIoU: 0 };
  }

  const cleanHoles = rawShape.holes
    .map((h) => simplifyCollinear(h))
    .filter((h) => h.length >= 3);

  const cleanShape: PolygonWithHoles = { outer: cleanOuter, holes: cleanHoles };
  const origin = shapeCentroid(cleanShape);
  const rawAngles: number[] = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];

  collectCandidateAngles(cleanOuter, origin, rawAngles);
  for (const hole of cleanHoles) {
    const hc = centroid(hole);
    if (Math.hypot(hc.x - origin.x, hc.y - origin.y) > 1e-3) {
      rawAngles.push(normalizeAxisAngle(Math.atan2(hc.y - origin.y, hc.x - origin.x)));
    }
    collectCandidateAngles(hole, origin, rawAngles);
  }

  // Deduplicate candidate angles within 0.006 rad (~0.34 deg)
  rawAngles.sort((a, b) => a - b);
  const candidates: number[] = [];
  for (const ang of rawAngles) {
    const prev = candidates[candidates.length - 1];
    if (prev === undefined || ang - prev > 0.006) {
      candidates.push(ang);
    }
  }

  let bestIoU = 0;
  let bestAngle = 0;

  for (const angle of candidates) {
    const reflectedOuter = reflectPolygon(cleanOuter, origin, angle);
    const outerIoU = polygonIoU(cleanOuter, reflectedOuter);
    if (outerIoU < bestIoU && cleanHoles.length === 0) continue;

    let combinedIoU = outerIoU;
    if (cleanHoles.length > 0) {
      const reflectedHoles = cleanHoles.map((h) => reflectPolygon(h, origin, angle));
      const hIoU = holeSetIoU(cleanHoles, reflectedHoles);
      combinedIoU = Math.min(outerIoU, hIoU);
    }

    if (combinedIoU > bestIoU) {
      bestIoU = combinedIoU;
      bestAngle = angle;
    }
  }

  if (bestIoU >= iouThreshold) {
    return {
      isSymmetric: true,
      axis: { origin, angle: bestAngle },
      bestIoU,
    };
  }

  return { isSymmetric: false, axis: null, bestIoU };
}

/**
 * Full puzzle state validation:
 * 1. Zero overlap between pieces
 * 2. All 3 pieces form a single contiguous edge-connected outer boundary (interior holes allowed)
 * 3. Outer boundary + interior holes together have line symmetry (pure point symmetry excluded)
 */
export function validatePuzzleState(pieces: Piece[]): ValidationResult {
  const worldPolys = pieces.map(getWorldVertices);
  const { hasOverlap, overlapArea } = computeTotalOverlap(worldPolys);
  const connectedCount = computeConnectedComponentSize(worldPolys);
  const unionRes = unionPolygons(worldPolys);

  const isSingleConnected =
    connectedCount === pieces.length && unionRes.isSinglePolygon && unionRes.shape !== null;

  let isSymmetric = false;
  let symmetryAxis: SymmetryAxis | null = null;

  if (!hasOverlap && isSingleConnected && unionRes.shape) {
    const sym = findSymmetryAxis(unionRes.shape);
    isSymmetric = sym.isSymmetric;
    symmetryAxis = sym.axis;
  }

  return {
    isSolved: !hasOverlap && isSingleConnected && isSymmetric,
    hasOverlap,
    overlapArea,
    isSingleConnected,
    hasHoles: unionRes.hasHoles,
    isSymmetric,
    symmetryAxis,
    unionShape: unionRes.shape,
    connectedCount,
  };
}
