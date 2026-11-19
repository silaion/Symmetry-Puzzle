import { useCallback, useEffect, useRef } from 'react';
import { normalizeAngle } from '../engine/geometry.ts';
import type { Piece, PuzzleSolution } from '../engine/types.ts';

function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  let diff = normalizeAngle(toDeg) - normalizeAngle(fromDeg);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Smoothly animates the 3 pieces from their current positions/rotations
 * to the stored ground-truth solution placement.
 */
export function useSolutionAnimation() {
  const rafRef = useRef<number | null>(null);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  const animateToSolution = useCallback(
    (
      currentPieces: Piece[],
      solution: PuzzleSolution,
      onFrame: (updatedPieces: Piece[]) => void,
      onComplete?: () => void,
      durationMs = 650,
    ) => {
      cancelAnimation();

      const startTime = performance.now();
      const snapshots = currentPieces.map((p) => {
        const target = solution.pieces.find((s) => s.pieceId === p.id);
        return {
          piece: p,
          startPos: { ...p.position },
          startRot: p.rotation,
          targetPos: target ? { ...target.solutionPosition } : { ...p.position },
          rotDelta: target ? shortestAngleDelta(p.rotation, target.solutionRotation) : 0,
        };
      });

      const step = (now: number) => {
        const rawT = Math.min(1, (now - startTime) / durationMs);
        const t = easeOutCubic(rawT);

        const nextPieces: Piece[] = snapshots.map((item) => ({
          ...item.piece,
          position: {
            x: item.startPos.x + (item.targetPos.x - item.startPos.x) * t,
            y: item.startPos.y + (item.targetPos.y - item.startPos.y) * t,
          },
          rotation: normalizeAngle(item.startRot + item.rotDelta * t),
        }));

        onFrame(nextPieces);

        if (rawT < 1) {
          rafRef.current = window.requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          onComplete?.();
        }
      };

      rafRef.current = window.requestAnimationFrame(step);
    },
    [cancelAnimation],
  );

  return { animateToSolution, cancelAnimation };
}
