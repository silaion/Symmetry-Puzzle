import { describe, expect, it } from 'vitest';
import {
  computeConnectedComponentSize,
  computeSnap,
  computeTotalOverlap,
  ensureCCW,
  polygonArea,
  rotatePoint,
  simplifyCollinear,
  unionPolygons,
} from '../geometry.ts';
import { findSymmetryAxis, validatePuzzleState } from '../symmetry.ts';
import { generatePuzzle } from '../generator.ts';
import type { Piece, Polygon } from '../types.ts';

describe('Geometry & Symmetry Engine', () => {
  it('detects line symmetry for a rectangle and rejects pure point symmetry (parallelogram)', () => {
    const rect: Polygon = [
      { x: -100, y: -50 },
      { x: 100, y: -50 },
      { x: 100, y: 50 },
      { x: -100, y: 50 },
    ];
    const rectSym = findSymmetryAxis(rect);
    expect(rectSym.isSymmetric).toBe(true);
    expect(rectSym.axis).not.toBeNull();

    // Skewed parallelogram: has 180-deg point symmetry, NO line symmetry
    const parallelogram: Polygon = [
      { x: -80, y: -40 },
      { x: 60, y: -40 },
      { x: 100, y: 40 },
      { x: -40, y: 40 },
    ];
    const paraSym = findSymmetryAxis(parallelogram);
    expect(paraSym.isSymmetric).toBe(false);
  });

  it('detects line symmetry at arbitrary rotated angles (e.g. 37 degrees)', () => {
    const kite: Polygon = [
      { x: 0, y: -100 },
      { x: 60, y: -10 },
      { x: 0, y: 70 },
      { x: -60, y: -10 },
    ];
    const rotated = ensureCCW(kite.map((p) => rotatePoint(p, 37)));
    const res = findSymmetryAxis(rotated);
    expect(res.isSymmetric).toBe(true);
    expect(res.bestIoU).toBeGreaterThan(0.99);
  });

  it('validates 3 edge-connected pieces forming a symmetric pentagon without internal seam symmetry', () => {
    // Symmetric pentagon split asymmetrically into 3 pieces
    const p1: Piece = {
      id: '1',
      localVertices: [
        { x: 0, y: -100 },
        { x: 80, y: -20 },
        { x: 10, y: 10 },
        { x: -30, y: -40 },
      ],
      position: { x: 400, y: 300 },
      rotation: 0,
      color: '#38bdf8',
    };
    const p2: Piece = {
      id: '2',
      localVertices: [
        { x: 0, y: -100 },
        { x: -30, y: -40 },
        { x: -10, y: 80 },
        { x: -60, y: 80 },
        { x: -80, y: -20 },
      ],
      position: { x: 400, y: 300 },
      rotation: 0,
      color: '#fbbf24',
    };
    const p3: Piece = {
      id: '3',
      localVertices: [
        { x: -30, y: -40 },
        { x: 10, y: 10 },
        { x: 80, y: -20 },
        { x: 60, y: 80 },
        { x: -10, y: 80 },
      ],
      position: { x: 400, y: 300 },
      rotation: 0,
      color: '#fb7185',
    };

    const result = validatePuzzleState([p1, p2, p3]);
    expect(result.hasOverlap).toBe(false);
    expect(result.connectedCount).toBe(3);
    expect(result.isSingleConnected).toBe(true);
    expect(result.isSymmetric).toBe(true);
    expect(result.isSolved).toBe(true);
  });

  it('rejects disconnected or overlapping pieces', () => {
    const tri: Polygon = [
      { x: 0, y: -30 },
      { x: 30, y: 30 },
      { x: -30, y: 30 },
    ];
    const polys: Polygon[] = [
      tri,
      tri.map((p) => ({ x: p.x + 120, y: p.y })),
      tri.map((p) => ({ x: p.x + 240, y: p.y })),
    ];
    expect(computeConnectedComponentSize(polys)).toBe(1);
    expect(computeTotalOverlap(polys).hasOverlap).toBe(false);
    expect(unionPolygons(polys).isSinglePolygon).toBe(false);

    const overlapping: Polygon[] = [tri, tri.map((p) => ({ x: p.x + 5, y: p.y }))];
    expect(computeTotalOverlap(overlapping).hasOverlap).toBe(true);
  });

  it('simplifies collinear vertices along merged seams', () => {
    const withExtra: Polygon = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    const simplified = simplifyCollinear(withExtra);
    expect(simplified.length).toBe(4);
  });

  it('generates valid puzzles for easy, normal, and hard difficulties', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < 10; i++) {
        const puzzle = generatePuzzle(diff);
        expect(puzzle.pieces).toHaveLength(3);
        expect(findSymmetryAxis(puzzle.targetShape).isSymmetric).toBe(true);
        for (const piece of puzzle.pieces) {
          expect(piece.localVertices.length).toBeGreaterThanOrEqual(3);
          expect(polygonArea(piece.localVertices)).toBeGreaterThan(500);
        }

        // Verify stored solution placement actually solves the puzzle
        const solvedPieces = puzzle.pieces.map((p) => {
          const sol = puzzle.solution.pieces.find((s) => s.pieceId === p.id)!;
          return {
            ...p,
            position: { ...sol.solutionPosition },
            rotation: sol.solutionRotation,
          };
        });
        const val = validatePuzzleState(solvedPieces);
        expect(val.isSolved).toBe(true);
      }
    }
  });

  it('accepts symmetric polygon with symmetric hole and rejects asymmetric hole', () => {
    const outer: Polygon = [
      { x: -100, y: -100 },
      { x: 100, y: -100 },
      { x: 100, y: 100 },
      { x: -100, y: 100 },
    ];
    const symmetricHole: Polygon = [
      { x: -30, y: -30 },
      { x: 30, y: -30 },
      { x: 30, y: 30 },
      { x: -30, y: 30 },
    ];
    const asymmetricHole: Polygon = [
      { x: 10, y: -40 },
      { x: 60, y: -20 },
      { x: 50, y: 40 },
      { x: 0, y: 10 },
    ];

    expect(findSymmetryAxis({ outer, holes: [symmetricHole] }).isSymmetric).toBe(true);
    expect(findSymmetryAxis({ outer, holes: [asymmetricHole] }).isSymmetric).toBe(false);
  });

  it('tolerates minor manual placement jitter (~1px, ~1deg) and edge-snaps rotated pieces', () => {
    const puzzle = generatePuzzle('normal');
    const jittered = puzzle.pieces.map((p, idx) => {
      const sol = puzzle.solution.pieces.find((s) => s.pieceId === p.id)!;
      return {
        ...p,
        position: {
          x: sol.solutionPosition.x + (idx === 0 ? 1.1 : idx === 1 ? -0.8 : 0.4),
          y: sol.solutionPosition.y + (idx === 0 ? -0.9 : idx === 1 ? 0.7 : -0.3),
        },
        rotation: sol.solutionRotation + (idx === 0 ? 0.8 : idx === 1 ? -0.6 : 0),
      };
    });
    const jitterRes = validatePuzzleState(jittered);
    expect({
      isSolved: jitterRes.isSolved,
      hasOverlap: jitterRes.hasOverlap,
      isSingleConnected: jitterRes.isSingleConnected,
      isSymmetric: jitterRes.isSymmetric,
      connectedCount: jitterRes.connectedCount,
      overlapArea: Math.round(jitterRes.overlapArea),
    }).toEqual({
      isSolved: true,
      hasOverlap: false,
      isSingleConnected: true,
      isSymmetric: true,
      connectedCount: 3,
      overlapArea: expect.any(Number),
    });

    // Edge snap test: piece 0 rotated 4 deg off and shifted 8px away should snap flush to piece 1
    const sol0 = puzzle.solution.pieces[0]!;
    const sol1 = puzzle.solution.pieces[1]!;
    const p1Placed = {
      ...puzzle.pieces[1]!,
      position: { ...sol1.solutionPosition },
      rotation: sol1.solutionRotation,
    };
    const p0Near = {
      ...puzzle.pieces[0]!,
      position: { x: sol0.solutionPosition.x + 6, y: sol0.solutionPosition.y - 5 },
      rotation: sol0.solutionRotation + 4,
    };
    const snap = computeSnap(p0Near, [p1Placed]);
    expect(snap.snapType).not.toBe('none');
  });

  it('generates holes at configured probabilities for Normal (50%) and Hard (80%) over 20 runs each and passes symmetry validation', () => {
    let normalHoleCount = 0;
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle('normal');
      if (puzzle.targetShape.holes.length >= 1) normalHoleCount++;

      const solvedPieces = puzzle.pieces.map((p) => {
        const sol = puzzle.solution.pieces.find((s) => s.pieceId === p.id)!;
        return {
          ...p,
          position: { ...sol.solutionPosition },
          rotation: sol.solutionRotation,
        };
      });
      const val = validatePuzzleState(solvedPieces);
      expect(val.isSymmetric).toBe(true);
      expect(val.isSolved).toBe(true);
    }
    // Normal ~50% (expect at least 3 and at most 17 out of 20)
    expect(normalHoleCount).toBeGreaterThanOrEqual(3);
    expect(normalHoleCount).toBeLessThanOrEqual(17);

    let hardHoleCount = 0;
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle('hard');
      if (puzzle.targetShape.holes.length >= 1) hardHoleCount++;

      const solvedPieces = puzzle.pieces.map((p) => {
        const sol = puzzle.solution.pieces.find((s) => s.pieceId === p.id)!;
        return {
          ...p,
          position: { ...sol.solutionPosition },
          rotation: sol.solutionRotation,
        };
      });
      const val = validatePuzzleState(solvedPieces);
      expect(val.isSymmetric).toBe(true);
      expect(val.isSolved).toBe(true);
    }
    // Hard ~80% (expect at least 10 out of 20)
    expect(hardHoleCount).toBeGreaterThanOrEqual(10);
  });
});
