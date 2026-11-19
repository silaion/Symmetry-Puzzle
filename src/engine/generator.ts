import polygonClipping from 'polygon-clipping';
import type { MultiPolygon as ClipMultiPolygon } from 'polygon-clipping';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  boundingBox,
  centroid,
  closestPointOnSegment,
  degToRad,
  dist,
  ensureCCW,
  getEdges,
  polygonArea,
  rotatePoint,
  simplifyCollinear,
  toClipPolygon,
  toClipShape,
  translatePoint,
} from './geometry.ts';
import { findSymmetryAxis, validatePuzzleState } from './symmetry.ts';
import type {
  Difficulty,
  Piece,
  PieceSolution,
  Point,
  Polygon,
  PolygonWithHoles,
  PuzzleData,
  SymmetryAxis,
} from './types.ts';

const PIECE_COLORS = ['#38bdf8', '#fbbf24', '#fb7185'] as const;
const EASY_ANGLES = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330] as const;

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

function minEdgeLength(poly: Polygon): number {
  let minLen = Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const d = dist(poly[i]!, poly[(i + 1) % n]!);
    if (d < minLen) minLen = d;
  }
  return minLen;
}

/**
 * Computes minimum distance between outer boundary and a hole boundary
 * to guarantee sufficient wall thickness.
 */
function minBoundaryClearance(outer: Polygon, hole: Polygon): number {
  let minD = Infinity;
  const outerEdges = getEdges(outer);
  const holeEdges = getEdges(hole);

  for (const hp of hole) {
    for (const oe of outerEdges) {
      const d = closestPointOnSegment(hp, oe.a, oe.b).dist;
      if (d < minD) minD = d;
    }
  }
  for (const op of outer) {
    for (const he of holeEdges) {
      const d = closestPointOnSegment(op, he.a, he.b).dist;
      if (d < minD) minD = d;
    }
  }
  return minD;
}

/**
 * Generates an unrotated symmetric outer polygon centered around (0, 0)
 * with vertical symmetry axis x = 0.
 * - Easy: 6~8 vertices
 * - Normal: 8~10 vertices (with concave indentation)
 * - Hard: 10~14 vertices (with deep concave notches)
 */
function generateBaseOuterPolygon(
  difficulty: Difficulty,
  withHoles: boolean,
): Polygon {
  const halfHeight = withHoles ? randomRange(122, 145) : randomRange(102, 132);
  const topY = -halfHeight;
  const botY = halfHeight;
  const rightPoints: Point[] = [];

  if (difficulty === 'easy') {
    // 6 to 8 vertices: 2~3 right points + top/bottom apexes
    const numRight = randomInt(2, 3);
    const ys: number[] = [];
    for (let i = 0; i < numRight; i++) {
      const frac = (i + 1) / (numRight + 1);
      ys.push(topY + frac * (botY - topY) + randomRange(-10, 10));
    }
    ys.sort((a, b) => a - b);

    for (let i = 0; i < numRight; i++) {
      rightPoints.push({ x: randomRange(62, 122), y: ys[i]! });
    }
    return buildMirroredPolygon(rightPoints, { x: 0, y: topY }, { x: 0, y: botY });
  }

  if (difficulty === 'normal') {
    // 8 to 10 vertices: 3~4 right points + top/bottom apexes, concave included
    const numRight = randomInt(3, 4);
    const ys: number[] = [];
    for (let i = 0; i < numRight; i++) {
      const frac = (i + 1) / (numRight + 1);
      ys.push(topY + frac * (botY - topY) + randomRange(-9, 9));
    }
    ys.sort((a, b) => a - b);

    for (let i = 0; i < numRight; i++) {
      const isIndent = i % 2 === 1;
      const x = isIndent
        ? randomRange(withHoles ? 78 : 48, withHoles ? 96 : 74)
        : randomRange(106, 144);
      rightPoints.push({ x, y: ys[i]! });
    }
    return buildMirroredPolygon(rightPoints, { x: 0, y: topY }, { x: 0, y: botY });
  }

  // Hard: 10 to 14 vertices (4~6 right points + top/bottom apexes), deep concave notches
  const numRight = randomInt(4, 6);
  const ys: number[] = [];
  for (let i = 0; i < numRight; i++) {
    const frac = (i + 1) / (numRight + 1);
    ys.push(topY + frac * (botY - topY) + randomRange(-7, 7));
  }
  ys.sort((a, b) => a - b);

  for (let i = 0; i < numRight; i++) {
    const isDeepNotch = i % 2 === 1;
    const x = isDeepNotch
      ? randomRange(withHoles ? 86 : 30, withHoles ? 104 : 62)
      : randomRange(withHoles ? 124 : 112, withHoles ? 158 : 150);
    rightPoints.push({ x, y: ys[i]! });
  }

  return buildMirroredPolygon(rightPoints, { x: 0, y: topY }, { x: 0, y: botY });
}

function buildMirroredPolygon(
  rightPoints: Point[],
  topApex: Point | null,
  botApex: Point | null,
): Polygon {
  const pts: Point[] = [];
  if (topApex) pts.push(topApex);
  for (const p of rightPoints) pts.push({ x: p.x, y: p.y });
  if (botApex) pts.push(botApex);
  for (let i = rightPoints.length - 1; i >= 0; i--) {
    const p = rightPoints[i]!;
    pts.push({ x: -p.x, y: p.y });
  }
  const c = centroid(pts);
  const centered = pts.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  return ensureCCW(simplifyCollinear(centered, 0.2, 0.5));
}

function rotatePolygon(poly: Polygon, angleDeg: number): Polygon {
  return ensureCCW(poly.map((p) => rotatePoint(p, angleDeg)));
}

function rotateShape(shape: PolygonWithHoles, angleDeg: number): PolygonWithHoles {
  return {
    outer: rotatePolygon(shape.outer, angleDeg),
    holes: shape.holes.map((h) => rotatePolygon(h, angleDeg)),
  };
}

/**
 * Generates 1 central symmetric hole (including irregular/concave variants on Hard)
 * or 2 mirrored symmetric twin holes inside `outer`.
 */
function generateSymmetricHoles(
  outer: Polygon,
  holeCount: 1 | 2,
  difficulty: Difficulty,
): Polygon[] {
  const bb = boundingBox(outer);
  const maxHalfW = Math.min(Math.abs(bb.minX), Math.abs(bb.maxX)) * 0.36;
  const maxHalfH = Math.min(Math.abs(bb.minY), Math.abs(bb.maxY)) * 0.38;

  if (holeCount === 1) {
    const hw = Math.max(22, Math.min(38, maxHalfW));
    const hh = Math.max(22, Math.min(42, maxHalfH));

    if (difficulty === 'hard') {
      // Irregular symmetric 6-to-8 vertex hole (arrowhead / notched diamond / shield)
      const kind = randomInt(0, 1);
      if (kind === 0) {
        const hole: Polygon = [
          { x: 0, y: -hh },
          { x: hw, y: -hh * 0.15 },
          { x: hw * 0.55, y: hh * 0.4 },
          { x: hw * 0.85, y: hh * 0.9 },
          { x: 0, y: hh * 0.5 },
          { x: -hw * 0.85, y: hh * 0.9 },
          { x: -hw * 0.55, y: hh * 0.4 },
          { x: -hw, y: -hh * 0.15 },
        ];
        return [ensureCCW(hole)];
      }
      const hole: Polygon = [
        { x: 0, y: -hh },
        { x: hw * 0.95, y: -hh * 0.35 },
        { x: hw * 0.45, y: hh * 0.1 },
        { x: hw * 0.75, y: hh * 0.7 },
        { x: 0, y: hh },
        { x: -hw * 0.75, y: hh * 0.7 },
        { x: -hw * 0.45, y: hh * 0.1 },
        { x: -hw * 0.95, y: -hh * 0.35 },
      ];
      return [ensureCCW(hole)];
    }

    const kind = randomInt(0, 2);
    if (kind === 0) {
      const midY = randomRange(-8, 10);
      return [
        ensureCCW([
          { x: 0, y: -hh },
          { x: hw, y: midY },
          { x: 0, y: hh },
          { x: -hw, y: midY },
        ]),
      ];
    }
    if (kind === 1) {
      const topW = hw * randomRange(0.65, 0.95);
      const botW = hw * randomRange(0.65, 0.95);
      return [
        ensureCCW([
          { x: -topW, y: -hh * 0.8 },
          { x: topW, y: -hh * 0.8 },
          { x: botW, y: hh * 0.8 },
          { x: -botW, y: hh * 0.8 },
        ]),
      ];
    }
    return [
      ensureCCW([
        { x: 0, y: -hh },
        { x: hw, y: -hh * 0.35 },
        { x: hw * 0.8, y: hh * 0.65 },
        { x: 0, y: hh },
        { x: -hw * 0.8, y: hh * 0.65 },
        { x: -hw, y: -hh * 0.35 },
      ]),
    ];
  }

  // 2 mirrored twin holes left and right of x = 0
  const offsetX = Math.max(38, Math.min(54, maxHalfW * 0.98));
  const rw = randomRange(17, 24);
  const rh = randomRange(22, 32);
  const cy = randomRange(-12, 12);
  const skew = randomRange(-5, 5);

  const rightHole: Polygon = ensureCCW([
    { x: offsetX - rw, y: cy - rh },
    { x: offsetX + rw, y: cy - rh + skew },
    { x: offsetX + rw * 0.85, y: cy + rh },
    { x: offsetX - rw, y: cy + rh - skew },
  ]);
  const leftHole: Polygon = ensureCCW(rightHole.map((p) => ({ x: -p.x, y: p.y })));
  return [leftHole, rightHole];
}

/**
 * Verifies that all holes sit strictly inside outer with sufficient wall thickness.
 */
function buildValidatedShape(outer: Polygon, candidateHoles: Polygon[]): PolygonWithHoles | null {
  if (candidateHoles.length === 0) {
    return { outer, holes: [] };
  }

  for (const h of candidateHoles) {
    if (minBoundaryClearance(outer, h) < 20) {
      return null;
    }
  }

  try {
    let diff = [toClipPolygon(outer, 100)];
    for (const h of candidateHoles) {
      diff = polygonClipping.difference(diff[0]!, toClipPolygon(h, 100));
      if (diff.length !== 1) return null;
    }
    const rings = diff[0]!;
    if (rings.length !== 1 + candidateHoles.length) return null;

    const cleanHoles: Polygon[] = [];
    for (let i = 1; i < rings.length; i++) {
      const r = rings[i]!;
      const pts: Point[] = [];
      for (let k = 0; k < r.length - 1; k++) {
        pts.push({ x: r[k]![0], y: r[k]![1] });
      }
      const simp = simplifyCollinear(ensureCCW(pts), 0.1, 0.3);
      if (simp.length < 3 || polygonArea(simp) < 900) return null;
      cleanHoles.push(simp);
    }

    return { outer, holes: cleanHoles };
  } catch {
    return null;
  }
}

function generateSymmetricShape(
  difficulty: Difficulty,
  targetHoleCount: 0 | 1 | 2,
): PolygonWithHoles {
  for (let i = 0; i < 20; i++) {
    const outer = generateBaseOuterPolygon(difficulty, targetHoleCount > 0);
    const holes =
      targetHoleCount === 1 || targetHoleCount === 2
        ? generateSymmetricHoles(outer, targetHoleCount, difficulty)
        : [];
    const validated = buildValidatedShape(outer, holes);
    if (validated) {
      const rotAngle =
        difficulty === 'easy'
          ? EASY_ANGLES[randomInt(0, EASY_ANGLES.length - 1)]!
          : randomRange(0, 360);
      return rotateShape(validated, rotAngle);
    }
  }

  // Fallback shape matching targetHoleCount = 0
  const fallbackOuter = generateBaseOuterPolygon(difficulty, false);
  const rotAngle =
    difficulty === 'easy'
      ? EASY_ANGLES[randomInt(0, EASY_ANGLES.length - 1)]!
      : randomRange(0, 360);
  return { outer: rotatePolygon(fallbackOuter, rotAngle), holes: [] };
}

/**
 * Builds a straight, 1-bend V-cut, or 2-stage zigzag cutting half-plane mask.
 */
function buildCuttingMask(
  origin: Point,
  angleDeg: number,
  bendMode: 'straight' | 'single' | 'zigzag' = 'straight',
): Polygon {
  const R = 1000;
  if (bendMode === 'straight') {
    const local: Polygon = [
      { x: -R, y: 0 },
      { x: R, y: 0 },
      { x: R, y: R },
      { x: -R, y: R },
    ];
    return ensureCCW(local.map((p) => translatePoint(rotatePoint(p, angleDeg), origin)));
  }

  if (bendMode === 'single') {
    const bendDeg = randomRange(-32, 32);
    const dy = Math.tan(degToRad(bendDeg)) * R;
    const local: Polygon = [
      { x: -R, y: dy },
      { x: 0, y: 0 },
      { x: R, y: dy },
      { x: R, y: R + Math.abs(dy) },
      { x: -R, y: R + Math.abs(dy) },
    ];
    return ensureCCW(local.map((p) => translatePoint(rotatePoint(p, angleDeg), origin)));
  }

  // 2-stage zigzag cut (two bends along the cut line)
  const stepX = randomRange(22, 38);
  const stepY = randomRange(18, 34) * (Math.random() < 0.5 ? 1 : -1);
  const slope = randomRange(-0.35, 0.35);
  const local: Polygon = [
    { x: -R, y: -R * slope },
    { x: -stepX, y: -stepX * slope },
    { x: 0, y: stepY },
    { x: stepX, y: stepX * slope },
    { x: R, y: R * slope },
    { x: R, y: R * 1.5 },
    { x: -R, y: R * 1.5 },
  ];
  return ensureCCW(local.map((p) => translatePoint(rotatePoint(p, angleDeg), origin)));
}

/**
 * Builds a radial wedge mask with optional elbow bend for asymmetric bridge cuts.
 */
function buildRadialBridgeWedge(
  hub: Point,
  startDeg: number,
  endDeg: number,
  elbowOffsetDeg1 = 0,
  elbowOffsetDeg2 = 0,
): Polygon {
  const R_ELBOW = 85;
  const R_FAR = 1200;
  const midDeg = (startDeg + endDeg) / 2;

  const a1 = degToRad(startDeg);
  const e1 = degToRad(startDeg + elbowOffsetDeg1);
  const aMid = degToRad(midDeg);
  const e2 = degToRad(endDeg + elbowOffsetDeg2);
  const a2 = degToRad(endDeg);

  return ensureCCW([
    hub,
    { x: hub.x + Math.cos(a1) * R_ELBOW, y: hub.y + Math.sin(a1) * R_ELBOW },
    { x: hub.x + Math.cos(e1) * R_FAR, y: hub.y + Math.sin(e1) * R_FAR },
    { x: hub.x + Math.cos(aMid) * R_FAR * 1.4, y: hub.y + Math.sin(aMid) * R_FAR * 1.4 },
    { x: hub.x + Math.cos(e2) * R_FAR, y: hub.y + Math.sin(e2) * R_FAR },
    { x: hub.x + Math.cos(a2) * R_ELBOW, y: hub.y + Math.sin(a2) * R_ELBOW },
  ]);
}

function extractSinglePolygon(res: ClipMultiPolygon): Polygon | null {
  if (res.length !== 1) return null;
  const rings = res[0]!;
  if (rings.length !== 1) return null; // each piece must be a simple polygon without holes
  const ring = rings[0]!;
  if (ring.length < 4) return null;
  const pts: Point[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    pts.push({ x: ring[i]![0], y: ring[i]![1] });
  }
  return simplifyCollinear(ensureCCW(pts), 0.05, 0.2);
}

function cutShapeWithMask(
  subject: PolygonWithHoles | Polygon,
  mask: Polygon,
): { inside: Polygon; outside: Polygon } | null {
  try {
    const sClip = Array.isArray(subject)
      ? toClipPolygon(subject, 100)
      : toClipShape(subject, 100);
    const mClip = toClipPolygon(mask, 100);

    const inter = polygonClipping.intersection(sClip, mClip);
    const diff = polygonClipping.difference(sClip, mClip);

    const inside = extractSinglePolygon(inter);
    const outside = extractSinglePolygon(diff);

    if (!inside || !outside) return null;
    return { inside, outside };
  } catch {
    return null;
  }
}

/**
 * Radial Bridge Dissection (3 asymmetric bridge cuts connecting hole boundary to outer boundary).
 * Guarantees 3 simple polygon pieces without holes and avoids trivial equal 120-deg trisection.
 */
function dissectSingleHoleRing(
  shape: PolygonWithHoles,
  difficulty: Difficulty,
): Polygon[] | null {
  const hole = shape.holes[0]!;
  const hc = centroid(hole);
  const hub: Point = {
    x: hc.x + randomRange(-5, 5),
    y: hc.y + randomRange(-5, 5),
  };

  const baseAngle = randomRange(0, 360);
  const span1 = randomRange(78, 148);
  const span2 = randomRange(82, 152);
  const span3 = 360 - span1 - span2;
  if (span3 < 72 || span3 > 165) return null;

  // Reject symmetric / near-equal angular spans
  if (
    Math.abs(span1 - span2) < 18 ||
    Math.abs(span2 - span3) < 18 ||
    Math.abs(span1 - span3) < 18
  ) {
    return null;
  }

  const angles = [
    baseAngle,
    baseAngle + span1,
    baseAngle + span1 + span2,
    baseAngle + 360,
  ];

  // Add bent elbow offsets on Hard difficulty
  const elbows =
    difficulty === 'hard'
      ? [randomRange(-14, 14), randomRange(-14, 14), randomRange(-14, 14)]
      : [0, 0, 0];

  const sClip = toClipShape(shape, 100);
  const pieces: Polygon[] = [];

  for (let i = 0; i < 3; i++) {
    try {
      const wedge = buildRadialBridgeWedge(
        hub,
        angles[i]!,
        angles[i + 1]!,
        elbows[i % 3]!,
        elbows[(i + 1) % 3]!,
      );
      const inter = polygonClipping.intersection(sClip, toClipPolygon(wedge, 100));
      const piece = extractSinglePolygon(inter);
      if (!piece) return null;
      pieces.push(piece);
    } catch {
      return null;
    }
  }

  return pieces;
}

/**
 * Splits a 2-hole symmetric shape into 3 simple polygon pieces
 * by cutting through both hole centers with asymmetric/zigzag cuts.
 */
function dissectTwoHoleShape(
  shape: PolygonWithHoles,
  difficulty: Difficulty,
): Polygon[] | null {
  const h1 = centroid(shape.holes[0]!);
  const h2 = centroid(shape.holes[1]!);

  try {
    const bendMode = difficulty === 'hard' && Math.random() < 0.5 ? 'single' : 'straight';
    const cut1 = buildCuttingMask(h1, randomRange(0, 360), bendMode);
    const sClip = toClipShape(shape, 100);
    const inter1 = polygonClipping.intersection(sClip, toClipPolygon(cut1, 100));
    const diff1 = polygonClipping.difference(sClip, toClipPolygon(cut1, 100));

    if (inter1.length !== 1 || diff1.length !== 1) return null;

    const polyInRings = inter1[0]!;
    const polyOutRings = diff1[0]!;

    const inHasHole = polyInRings.length > 1;
    const outHasHole = polyOutRings.length > 1;
    if (inHasHole && outHasHole) return null;

    let singlePiece: Polygon | null = null;
    let remainderClip: [typeof polyInRings] | null = null;

    if (inHasHole) {
      singlePiece = extractSinglePolygon(diff1);
      remainderClip = [polyInRings];
    } else if (outHasHole) {
      singlePiece = extractSinglePolygon(inter1);
      remainderClip = [polyOutRings];
    } else {
      const pIn = extractSinglePolygon(inter1);
      const pOut = extractSinglePolygon(diff1);
      if (!pIn || !pOut) return null;
      if (polygonArea(pIn) < polygonArea(pOut)) {
        singlePiece = pIn;
        remainderClip = [polyOutRings];
      } else {
        singlePiece = pOut;
        remainderClip = [polyInRings];
      }
    }

    if (!singlePiece || !remainderClip) return null;

    const cut2 = buildCuttingMask(h2, randomRange(0, 360), bendMode);
    const inter2 = polygonClipping.intersection(remainderClip, toClipPolygon(cut2, 100));
    const diff2 = polygonClipping.difference(remainderClip, toClipPolygon(cut2, 100));

    const p2 = extractSinglePolygon(inter2);
    const p3 = extractSinglePolygon(diff2);
    if (!p2 || !p3) return null;

    return [singlePiece, p2, p3];
  } catch {
    return null;
  }
}

/**
 * Generates a complete procedural puzzle guaranteed to be solvable without reflection.
 * - Easy: 6~8 vertices, 30°/45°/60° diagonal cuts, 0 holes
 * - Normal: 8~10 vertices, concave + arbitrary cuts, 50% chance of 1 symmetric hole
 * - Hard: 10~14 vertices, deep concave + 2-stage zigzag cuts, 80% chance of 1~2 symmetric holes
 */
export function generatePuzzle(difficulty: Difficulty): PuzzleData {
  // Determine target hole count according to difficulty probability
  let targetHoleCount: 0 | 1 | 2 = 0;
  if (difficulty === 'normal' && Math.random() < 0.5) {
    targetHoleCount = 1;
  } else if (difficulty === 'hard' && Math.random() < 0.8) {
    targetHoleCount = Math.random() < 0.65 ? 1 : 2;
  }

  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // If 2-hole dissection struggles after 65 attempts, fall back to 1-hole while preserving holes >= 1
    const effectiveHoleCount: 0 | 1 | 2 =
      targetHoleCount === 2 && attempt >= 65 ? 1 : targetHoleCount;

    const targetShape = generateSymmetricShape(difficulty, effectiveHoleCount);
    if (effectiveHoleCount > 0 && targetShape.holes.length === 0) continue;

    let totalArea = polygonArea(targetShape.outer);
    for (const h of targetShape.holes) totalArea -= polygonArea(h);
    if (totalArea < 7500) continue;

    let rawPieces: Polygon[] | null = null;

    if (targetShape.holes.length === 1) {
      rawPieces = dissectSingleHoleRing(targetShape, difficulty);
    } else if (targetShape.holes.length === 2) {
      rawPieces = dissectTwoHoleShape(targetShape, difficulty);
    } else {
      // 0-hole dissection
      const cut1Origin = {
        x: randomRange(-26, 26),
        y: randomRange(-26, 26),
      };
      const cut1Angle =
        difficulty === 'easy'
          ? EASY_ANGLES[randomInt(0, EASY_ANGLES.length - 1)]!
          : randomRange(0, 360);
      const cut1Bend: 'straight' | 'single' | 'zigzag' =
        difficulty === 'hard'
          ? Math.random() < 0.7
            ? 'zigzag'
            : 'single'
          : difficulty === 'normal' && Math.random() < 0.4
            ? 'single'
            : 'straight';

      const cut1Res = cutShapeWithMask(
        targetShape.outer,
        buildCuttingMask(cut1Origin, cut1Angle, cut1Bend),
      );
      if (!cut1Res) continue;

      const areaIn = polygonArea(cut1Res.inside);
      const areaOut = polygonArea(cut1Res.outside);
      const firstPiece = areaIn < areaOut ? cut1Res.inside : cut1Res.outside;
      const remainder = areaIn < areaOut ? cut1Res.outside : cut1Res.inside;

      const firstFrac = polygonArea(firstPiece) / totalArea;
      if (firstFrac < 0.17 || firstFrac > 0.48) continue;

      const remCenter = centroid(remainder);
      const cut2Origin = {
        x: remCenter.x + randomRange(-18, 18),
        y: remCenter.y + randomRange(-18, 18),
      };
      const cut2Angle =
        difficulty === 'easy'
          ? EASY_ANGLES[randomInt(0, EASY_ANGLES.length - 1)]!
          : cut1Angle + randomRange(35, 145);
      const cut2Bend: 'straight' | 'single' | 'zigzag' =
        difficulty === 'hard' && Math.random() < 0.6
          ? 'zigzag'
          : difficulty !== 'easy' && Math.random() < 0.4
            ? 'single'
            : 'straight';

      const cut2Res = cutShapeWithMask(
        remainder,
        buildCuttingMask(cut2Origin, cut2Angle, cut2Bend),
      );
      if (!cut2Res) continue;

      rawPieces = [firstPiece, cut2Res.inside, cut2Res.outside];
    }

    if (!rawPieces) continue;

    // Validate piece constraints
    let valid = true;
    for (const p of rawPieces) {
      const frac = polygonArea(p) / totalArea;
      if (frac < 0.14 || frac > 0.56) {
        valid = false;
        break;
      }
      if (p.length < 3 || p.length > 16) {
        valid = false;
        break;
      }
      if (minEdgeLength(p) < 18) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    // Prefer asymmetric pieces
    if (attempt < 55) {
      const symCount = rawPieces.filter((p) => findSymmetryAxis(p, 0.95).isSymmetric).length;
      if (symCount >= 2) continue;
    }

    const candidate = buildPuzzleData(difficulty, targetShape, rawPieces);
    const solvedCheck = candidate.pieces.map((p) => {
      const sol = candidate.solution.pieces.find((s) => s.pieceId === p.id)!;
      return {
        ...p,
        position: { ...sol.solutionPosition },
        rotation: sol.solutionRotation,
      };
    });
    if (!validatePuzzleState(solvedCheck).isSolved) continue;

    return candidate;
  }

  // Deterministic fallback (with hole if targetHoleCount > 0)
  if (targetHoleCount > 0) {
    const holeFallback: PolygonWithHoles = {
      outer: [
        { x: 0, y: -135 },
        { x: 128, y: -45 },
        { x: 100, y: 115 },
        { x: -100, y: 115 },
        { x: -128, y: -45 },
      ],
      holes: [
        [
          { x: 0, y: -44 },
          { x: 38, y: 0 },
          { x: 0, y: 44 },
          { x: -38, y: 0 },
        ],
      ],
    };
    const sClip = toClipShape(holeFallback, 100);
    const fixedAngles = [15, 110, 235, 375];
    const fbPieces: Polygon[] = [];
    for (let i = 0; i < 3; i++) {
      const w = buildRadialBridgeWedge({ x: 0, y: 0 }, fixedAngles[i]!, fixedAngles[i + 1]!);
      const inter = polygonClipping.intersection(sClip, toClipPolygon(w, 100));
      const p = extractSinglePolygon(inter);
      if (p) fbPieces.push(p);
    }
    if (fbPieces.length === 3) {
      return buildPuzzleData(difficulty, holeFallback, fbPieces);
    }
  }

  const fallbackShape: PolygonWithHoles = {
    outer: [
      { x: 0, y: -110 },
      { x: 95, y: -30 },
      { x: 70, y: 95 },
      { x: -70, y: 95 },
      { x: -95, y: -30 },
    ],
    holes: [],
  };
  const fallbackPieces: Polygon[] = [
    [
      { x: 0, y: -110 },
      { x: 95, y: -30 },
      { x: 15, y: 10 },
      { x: -35, y: -35 },
    ],
    [
      { x: 0, y: -110 },
      { x: -35, y: -35 },
      { x: -10, y: 95 },
      { x: -70, y: 95 },
      { x: -95, y: -30 },
    ],
    [
      { x: -35, y: -35 },
      { x: 15, y: 10 },
      { x: 95, y: -30 },
      { x: 70, y: 95 },
      { x: -10, y: 95 },
    ],
  ];
  return buildPuzzleData(difficulty, fallbackShape, fallbackPieces);
}

function buildPuzzleData(
  difficulty: Difficulty,
  targetShape: PolygonWithHoles,
  rawPieces: Polygon[],
): PuzzleData {
  const boardCenter: Point = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };

  const symRes = findSymmetryAxis(targetShape, 0.9);
  const symmetryAxis: SymmetryAxis = symRes.axis
    ? {
        origin: {
          x: boardCenter.x + symRes.axis.origin.x,
          y: boardCenter.y + symRes.axis.origin.y,
        },
        angle: symRes.axis.angle,
      }
    : {
        origin: { ...boardCenter },
        angle: Math.PI / 2,
      };

  const scatterSlots: Point[] = [
    { x: BOARD_WIDTH * 0.24, y: BOARD_HEIGHT * 0.34 },
    { x: BOARD_WIDTH * 0.74, y: BOARD_HEIGHT * 0.34 },
    { x: BOARD_WIDTH * 0.50, y: BOARD_HEIGHT * 0.73 },
  ];

  const shuffledSlots = [...scatterSlots].sort(() => Math.random() - 0.5);

  const solutionPieces: PieceSolution[] = [];
  const pieces: Piece[] = rawPieces.map((poly, idx) => {
    const id = `piece-${idx + 1}`;
    const c = centroid(poly);
    const localVertices = ensureCCW(poly.map((p) => ({ x: p.x - c.x, y: p.y - c.y })));
    const slot = shuffledSlots[idx]!;

    solutionPieces.push({
      pieceId: id,
      solutionPosition: {
        x: boardCenter.x + c.x,
        y: boardCenter.y + c.y,
      },
      solutionRotation: 0,
    });

    return {
      id,
      localVertices,
      position: {
        x: slot.x + randomRange(-20, 20),
        y: slot.y + randomRange(-15, 15),
      },
      rotation: randomInt(5, 67) * 5,
      color: PIECE_COLORS[idx % PIECE_COLORS.length]!,
    };
  });

  return {
    id: `pzl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    difficulty,
    pieces,
    targetShape,
    solution: {
      pieces: solutionPieces,
      symmetryAxis,
    },
  };
}
