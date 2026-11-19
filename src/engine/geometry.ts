import polygonClipping from 'polygon-clipping';
import type { Ring, Polygon as ClipPolygon, MultiPolygon as ClipMultiPolygon } from 'polygon-clipping';
import type { Edge, Piece, Point, Polygon, PolygonWithHoles, SnapResult } from './types.ts';

export const BOARD_WIDTH = 800;
export const BOARD_HEIGHT = 600;
export const OVERLAP_EPSILON = 260.0; // px^2 (~2px tolerance along ~120px seams)
export const MIN_SHARED_EDGE_LENGTH = 8.0; // px
export const SNAP_DISTANCE = 20.0; // px
export const EDGE_SNAP_ANGLE_DEG = 8.0; // degrees

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeAngle(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

export function distSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function rotatePoint(p: Point, angleDeg: number): Point {
  const r = degToRad(angleDeg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {
    x: p.x * c - p.y * s,
    y: p.x * s + p.y * c,
  };
}

export function translatePoint(p: Point, offset: Point): Point {
  return { x: p.x + offset.x, y: p.y + offset.y };
}

/**
 * Signed area using the Shoelace formula.
 * Positive if counter-clockwise in standard Cartesian coordinates.
 */
export function signedArea(poly: Polygon): number {
  const n = poly.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p1 = poly[i]!;
    const p2 = poly[(i + 1) % n]!;
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return sum / 2;
}

export function polygonArea(poly: Polygon): number {
  return Math.abs(signedArea(poly));
}

export function ensureCCW(poly: Polygon): Polygon {
  if (poly.length < 3) return [...poly];
  return signedArea(poly) < 0 ? [...poly].reverse() : [...poly];
}

export function centroid(poly: Polygon): Point {
  const n = poly.length;
  if (n === 0) return { x: 0, y: 0 };
  const a = signedArea(poly);
  if (Math.abs(a) < 1e-6) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / n, y: sy / n };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const p1 = poly[i]!;
    const p2 = poly[(i + 1) % n]!;
    const f = p1.x * p2.y - p2.x * p1.y;
    cx += (p1.x + p2.x) * f;
    cy += (p1.y + p2.y) * f;
  }
  const denom = 6 * a;
  return { x: cx / denom, y: cy / denom };
}

export function getWorldVertices(piece: Piece): Polygon {
  return piece.localVertices.map((v) => {
    const r = rotatePoint(v, piece.rotation);
    return translatePoint(r, piece.position);
  });
}

export function getEdges(poly: Polygon): Edge[] {
  const edges: Edge[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    edges.push({ a: poly[i]!, b: poly[(i + 1) % n]! });
  }
  return edges;
}

export function boundingBox(poly: Polygon): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Ray casting point-in-polygon test. */
export function pointInPolygon(p: Point, poly: Polygon): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = poly[i]!;
    const pj = poly[j]!;
    const intersect =
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Distance from point p to line segment ab, and closest point on segment. */
export function closestPointOnSegment(p: Point, a: Point, b: Point): { point: Point; dist: number; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-10) {
    return { point: { ...a }, dist: dist(p, a), t: 0 };
  }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * abx, y: a.y + t * aby };
  return { point: proj, dist: dist(p, proj), t };
}

function toClipRing(poly: Polygon, precision = 100): Ring {
  const ccw = ensureCCW(poly);
  const ring: Ring = ccw.map((p) => [
    Math.round(p.x * precision) / precision,
    Math.round(p.y * precision) / precision,
  ]);
  if (ring.length > 0) {
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  return ring;
}

function fromClipRing(ring: Ring): Polygon {
  if (ring.length < 3) return [];
  const pts: Point[] = [];
  const limit =
    ring.length > 1 &&
    ring[0]![0] === ring[ring.length - 1]![0] &&
    ring[0]![1] === ring[ring.length - 1]![1]
      ? ring.length - 1
      : ring.length;
  for (let i = 0; i < limit; i++) {
    const coord = ring[i]!;
    pts.push({ x: coord[0], y: coord[1] });
  }
  return ensureCCW(pts);
}

export function toClipPolygon(poly: Polygon, precision = 100): ClipPolygon {
  return [toClipRing(poly, precision)];
}

export function toClipShape(shape: PolygonWithHoles, precision = 100): ClipPolygon {
  const rings: Ring[] = [toClipRing(shape.outer, precision)];
  for (const hole of shape.holes) {
    rings.push(toClipRing(hole, precision));
  }
  return rings;
}

/** Computes intersection area of two simple polygons. */
export function intersectionArea(polyA: Polygon, polyB: Polygon): number {
  if (polyA.length < 3 || polyB.length < 3) return 0;
  try {
    const res = polygonClipping.intersection(toClipPolygon(polyA), toClipPolygon(polyB));
    let total = 0;
    for (const poly of res) {
      if (poly.length === 0) continue;
      total += polygonArea(fromClipRing(poly[0]!));
      for (let h = 1; h < poly.length; h++) {
        total -= polygonArea(fromClipRing(poly[h]!));
      }
    }
    return Math.max(0, total);
  } catch {
    return 0;
  }
}

/** Computes total pairwise overlap area among polygons. */
export function computeTotalOverlap(polys: Polygon[]): { hasOverlap: boolean; overlapArea: number } {
  let maxPairArea = 0;
  let totalArea = 0;
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const area = intersectionArea(polys[i]!, polys[j]!);
      totalArea += area;
      if (area > maxPairArea) maxPairArea = area;
    }
  }
  return {
    hasOverlap: maxPairArea > OVERLAP_EPSILON,
    overlapArea: totalArea,
  };
}

/**
 * Computes the shared collinear overlap length between two edges.
 * Returns > 0 only if edges are nearly collinear and close enough.
 */
export function sharedEdgeLength(e1: Edge, e2: Edge, distTol = 3.5, angleTolDeg = 4.0): number {
  const v1 = { x: e1.b.x - e1.a.x, y: e1.b.y - e1.a.y };
  const v2 = { x: e2.b.x - e2.a.x, y: e2.b.y - e2.a.y };
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 < 1e-4 || len2 < 1e-4) return 0;

  const u1 = { x: v1.x / len1, y: v1.y / len1 };
  const u2 = { x: v2.x / len2, y: v2.y / len2 };

  // Parallel or anti-parallel check
  const cosAngle = Math.abs(dot(u1, u2));
  if (cosAngle < Math.cos(degToRad(angleTolDeg))) return 0;

  // Project e2 onto u1 axis relative to e1.a
  const p2a = dot({ x: e2.a.x - e1.a.x, y: e2.a.y - e1.a.y }, u1);
  const p2b = dot({ x: e2.b.x - e1.a.x, y: e2.b.y - e1.a.y }, u1);
  const min2 = Math.min(p2a, p2b);
  const max2 = Math.max(p2a, p2b);

  const overlapStart = Math.max(0, min2);
  const overlapEnd = Math.min(len1, max2);
  const overlapLen = overlapEnd - overlapStart;
  if (overlapLen <= 0) return 0;

  // Check perpendicular distance at the midpoint of the shared interval
  const midProj = (overlapStart + overlapEnd) / 2;
  const midOnE1 = { x: e1.a.x + u1.x * midProj, y: e1.a.y + u1.y * midProj };
  const closestOnE2 = closestPointOnSegment(midOnE1, e2.a, e2.b);
  if (closestOnE2.dist > distTol) return 0;

  return overlapLen;
}

/** Checks if two polygons touch along an edge of at least MIN_SHARED_EDGE_LENGTH. */
export function arePolygonsEdgeAdjacent(polyA: Polygon, polyB: Polygon): boolean {
  const edgesA = getEdges(polyA);
  const edgesB = getEdges(polyB);
  for (const ea of edgesA) {
    for (const eb of edgesB) {
      if (sharedEdgeLength(ea, eb) >= MIN_SHARED_EDGE_LENGTH) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Computes the size of the largest connected component of pieces via edge adjacency.
 * Returns 3 if all 3 pieces form a single connected component.
 */
export function computeConnectedComponentSize(polys: Polygon[]): number {
  const n = polys.length;
  if (n === 0) return 0;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (arePolygonsEdgeAdjacent(polys[i]!, polys[j]!)) {
        adj[i]!.push(j);
        adj[j]!.push(i);
      }
    }
  }

  const visited = new Array<boolean>(n).fill(false);
  let maxComp = 0;
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    let count = 0;
    const queue = [i];
    visited[i] = true;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      count++;
      for (const nxt of adj[curr]!) {
        if (!visited[nxt]) {
          visited[nxt] = true;
          queue.push(nxt);
        }
      }
    }
    if (count > maxComp) maxComp = count;
  }
  return maxComp;
}

/**
 * Removes nearly collinear redundant vertices from a polygon.
 */
export function simplifyCollinear(poly: Polygon, distTol = 0.8, angleTolDeg = 1.5): Polygon {
  let pts = [...poly];
  if (pts.length <= 3) return pts;

  let changed = true;
  const cosTol = Math.cos(degToRad(angleTolDeg));

  while (changed && pts.length > 3) {
    changed = false;
    const nextPts: Point[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n]!;
      const curr = pts[i]!;
      const next = pts[(i + 1) % n]!;

      // Duplicate check
      if (dist(prev, curr) < 0.2) {
        changed = true;
        continue;
      }

      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const l1 = Math.hypot(v1.x, v1.y);
      const l2 = Math.hypot(v2.x, v2.y);

      if (l1 < 1e-5 || l2 < 1e-5) {
        changed = true;
        continue;
      }

      const d = dot(v1, v2) / (l1 * l2);
      const perp = closestPointOnSegment(curr, prev, next).dist;
      if (d >= cosTol && perp <= distTol) {
        changed = true;
        continue;
      }
      nextPts.push(curr);
    }
    pts = nextPts;
  }

  return ensureCCW(pts);
}

function inflatePolygon(poly: Polygon, amount: number): Polygon {
  const c = centroid(poly);
  return poly.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) return p;
    return { x: p.x + (dx / len) * amount, y: p.y + (dy / len) * amount };
  });
}

function tryUnionClip(polys: Polygon[], precision: number): {
  isSinglePolygon: boolean;
  hasHoles: boolean;
  shape: PolygonWithHoles | null;
} {
  const clipPolys: ClipPolygon[] = polys.map((p) => toClipPolygon(p, precision));
  const first = clipPolys[0]!;
  const rest = clipPolys.slice(1);
  const res: ClipMultiPolygon = polygonClipping.union(first, ...rest);

  if (res.length !== 1) {
    return { isSinglePolygon: false, hasHoles: false, shape: null };
  }

  const single = res[0]!;
  const outerRaw = fromClipRing(single[0]!);
  const outer = simplifyCollinear(outerRaw);
  if (outer.length < 3) {
    return { isSinglePolygon: false, hasHoles: false, shape: null };
  }

  const holes: Polygon[] = [];
  for (let i = 1; i < single.length; i++) {
    const hRaw = fromClipRing(single[i]!);
    const hSimp = simplifyCollinear(hRaw);
    if (hSimp.length >= 3 && polygonArea(hSimp) >= 25) {
      holes.push(hSimp);
    }
  }

  const hasHoles = holes.length > 0;
  return {
    isSinglePolygon: true,
    hasHoles,
    shape: { outer, holes },
  };
}

/**
 * Computes the union of polygons, preserving interior holes.
 * Falls back to micro-welding when edge-adjacent pieces have sub-2px hand-placement gaps.
 */
export function unionPolygons(polys: Polygon[]): {
  isSinglePolygon: boolean;
  hasHoles: boolean;
  shape: PolygonWithHoles | null;
} {
  if (polys.length === 0) {
    return { isSinglePolygon: false, hasHoles: false, shape: null };
  }

  try {
    const exact = tryUnionClip(polys, 10);
    if (exact.isSinglePolygon) return exact;

    // If all pieces are edge-adjacent, weld micro-gaps (< 2px) from manual dragging
    if (computeConnectedComponentSize(polys) === polys.length) {
      const weldedPolys = polys.map((p) => inflatePolygon(p, 1.8));
      const welded = tryUnionClip(weldedPolys, 10);
      if (welded.isSinglePolygon) return welded;
    }

    return { isSinglePolygon: false, hasHoles: false, shape: null };
  } catch {
    return { isSinglePolygon: false, hasHoles: false, shape: null };
  }
}

/**
 * Computes magnetic snap (vertex-to-vertex and edge-to-edge) for activePiece against otherPieces.
 */
export function computeSnap(activePiece: Piece, otherPieces: Piece[]): SnapResult {
  if (otherPieces.length === 0) {
    return { snappedPosition: activePiece.position, snapType: 'none', snapPoints: [] };
  }

  const activeWorld = getWorldVertices(activePiece);
  const otherWorlds = otherPieces.map(getWorldVertices);

  // 1. Check vertex-to-vertex snapping first (highest precision)
  let bestVertDist = SNAP_DISTANCE;
  let bestDelta: Point | null = null;
  let bestSnapPoint: Point | null = null;

  for (const va of activeWorld) {
    for (const otherPoly of otherWorlds) {
      for (const vo of otherPoly) {
        const d = dist(va, vo);
        if (d < bestVertDist) {
          bestVertDist = d;
          bestDelta = { x: vo.x - va.x, y: vo.y - va.y };
          bestSnapPoint = vo;
        }
      }
    }
  }

  // 2. Check edge-to-edge alignment snapping (parallel opposing edges)
  const activeEdges = getEdges(activeWorld);
  let bestEdgeDist = SNAP_DISTANCE;
  let bestEdgeDelta: Point | null = null;
  let bestRotAdjust: number | undefined;
  let bestEdgeMid: Point | null = null;

  for (const ea of activeEdges) {
    const va = { x: ea.b.x - ea.a.x, y: ea.b.y - ea.a.y };
    const angA = Math.atan2(va.y, va.x);
    const midA = { x: (ea.a.x + ea.b.x) / 2, y: (ea.a.y + ea.b.y) / 2 };

    for (const otherPoly of otherWorlds) {
      const otherEdges = getEdges(otherPoly);
      for (const eo of otherEdges) {
        const vo = { x: eo.b.x - eo.a.x, y: eo.b.y - eo.a.y };
        const angO = Math.atan2(vo.y, vo.x);
        // Opposing CCW edges should differ by ~180 degrees (PI radians)
        let angleDiff = radToDeg(angO - angA - Math.PI);
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        if (Math.abs(angleDiff) <= EDGE_SNAP_ANGLE_DEG) {
          // Check distance from midA to segment eo
          const proj = closestPointOnSegment(midA, eo.a, eo.b);
          if (proj.dist < bestEdgeDist) {
            bestEdgeDist = proj.dist;
            bestRotAdjust = normalizeAngle(activePiece.rotation + angleDiff);

            // Recompute rotated edge endpoints around activePiece.position to align flush
            const testPiece: Piece = { ...activePiece, rotation: bestRotAdjust };
            const testVerts = getWorldVertices(testPiece);
            const idxA = activeEdges.indexOf(ea);
            const newEaA = testVerts[idxA]!;
            const newEaB = testVerts[(idxA + 1) % testVerts.length]!;
            const newMidA = { x: (newEaA.x + newEaB.x) / 2, y: (newEaA.y + newEaB.y) / 2 };

            // Perpendicular vector to eo
            const lenO = Math.hypot(vo.x, vo.y);
            if (lenO > 1e-4) {
              const projNew = closestPointOnSegment(newMidA, eo.a, eo.b);
              const shiftX = projNew.point.x - newMidA.x;
              const shiftY = projNew.point.y - newMidA.y;

              // Also check if either endpoint is close to eo's endpoints for sliding alignment
              let slideX = 0;
              let slideY = 0;
              const candPairs: Array<[Point, Point]> = [
                [ { x: newEaA.x + shiftX, y: newEaA.y + shiftY }, eo.b ],
                [ { x: newEaB.x + shiftX, y: newEaB.y + shiftY }, eo.a ],
                [ { x: newEaA.x + shiftX, y: newEaA.y + shiftY }, eo.a ],
                [ { x: newEaB.x + shiftX, y: newEaB.y + shiftY }, eo.b ],
              ];
              let minSlide = SNAP_DISTANCE;
              for (const [p1, p2] of candPairs) {
                const sd = dist(p1, p2);
                if (sd < minSlide) {
                  minSlide = sd;
                  slideX = p2.x - p1.x;
                  slideY = p2.y - p1.y;
                }
              }

              bestEdgeDelta = { x: shiftX + slideX, y: shiftY + slideY };
              bestEdgeMid = projNew.point;
            }
          }
        }
      }
    }
  }

  // Prefer edge-to-edge snap so angle and seam align flush
  if (bestEdgeDelta && bestRotAdjust !== undefined) {
    return {
      snappedPosition: {
        x: activePiece.position.x + bestEdgeDelta.x,
        y: activePiece.position.y + bestEdgeDelta.y,
      },
      snappedRotation: bestRotAdjust,
      snapType: 'edge',
      snapPoints: bestEdgeMid ? [bestEdgeMid] : [],
    };
  }

  if (bestDelta) {
    return {
      snappedPosition: {
        x: activePiece.position.x + bestDelta.x,
        y: activePiece.position.y + bestDelta.y,
      },
      snapType: 'vertex',
      snapPoints: bestSnapPoint ? [bestSnapPoint] : [],
    };
  }

  return { snappedPosition: activePiece.position, snapType: 'none', snapPoints: [] };
}
