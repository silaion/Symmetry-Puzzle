import React, { useCallback, useRef, useState } from 'react';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  computeSnap,
  getWorldVertices,
  normalizeAngle,
  radToDeg,
} from '../engine/geometry.ts';
import type { Piece, Point, SymmetryAxis, ValidationResult } from '../engine/types.ts';

interface PuzzleCanvasProps {
  pieces: Piece[];
  selectedId: string | null;
  snapEnabled: boolean;
  angleStep: number;
  validation: ValidationResult;
  isLocked?: boolean;
  revealedAxis?: SymmetryAxis | null;
  onSelectPiece: (id: string | null) => void;
  onUpdatePiece: (id: string, position: Point, rotation: number) => void;
  onRotateBy: (id: string, deltaDeg: number) => void;
  onSnapTriggered: () => void;
}

type DragMode =
  | { kind: 'none' }
  | {
      kind: 'move';
      pieceId: string;
      startPointer: Point;
      startPos: Point;
      startRot: number;
      wasSnapped: boolean;
    }
  | {
      kind: 'rotate';
      pieceId: string;
      center: Point;
      startPointerAngle: number;
      startPieceRot: number;
    };

function toPathD(pts: Point[]): string {
  if (pts.length === 0) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

export const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  pieces,
  selectedId,
  snapEnabled,
  angleStep,
  validation,
  isLocked = false,
  revealedAxis = null,
  onSelectPiece,
  onUpdatePiece,
  onRotateBy,
  onSnapTriggered,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragMode>({ kind: 'none' });
  const [snapPoints, setSnapPoints] = useState<Point[]>([]);

  const clientToBoard = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / BOARD_WIDTH, rect.height / BOARD_HEIGHT);
    const renderedW = BOARD_WIDTH * scale;
    const renderedH = BOARD_HEIGHT * scale;
    const offsetX = rect.left + (rect.width - renderedW) / 2;
    const offsetY = rect.top + (rect.height - renderedH) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale,
    };
  }, []);

  const handlePiecePointerDown = (e: React.PointerEvent, piece: Piece) => {
    e.stopPropagation();
    if (isLocked) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    onSelectPiece(piece.id);
    const pt = clientToBoard(e.clientX, e.clientY);
    dragRef.current = {
      kind: 'move',
      pieceId: piece.id,
      startPointer: pt,
      startPos: { ...piece.position },
      startRot: piece.rotation,
      wasSnapped: false,
    };
  };

  const handleRotatePointerDown = (e: React.PointerEvent, piece: Piece) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const pt = clientToBoard(e.clientX, e.clientY);
    const angle = radToDeg(Math.atan2(pt.y - piece.position.y, pt.x - piece.position.x));
    dragRef.current = {
      kind: 'rotate',
      pieceId: piece.id,
      center: { ...piece.position },
      startPointerAngle: angle,
      startPieceRot: piece.rotation,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.kind === 'none') return;

    const pt = clientToBoard(e.clientX, e.clientY);

    if (drag.kind === 'move') {
      const dx = pt.x - drag.startPointer.x;
      const dy = pt.y - drag.startPointer.y;
      const rawPos: Point = {
        x: Math.max(30, Math.min(BOARD_WIDTH - 30, drag.startPos.x + dx)),
        y: Math.max(30, Math.min(BOARD_HEIGHT - 30, drag.startPos.y + dy)),
      };

      const active = pieces.find((p) => p.id === drag.pieceId);
      if (!active) return;

      if (snapEnabled) {
        const movedPiece: Piece = { ...active, position: rawPos, rotation: drag.startRot };
        const others = pieces.filter((p) => p.id !== drag.pieceId);
        const snapRes = computeSnap(movedPiece, others);

        if (snapRes.snapType !== 'none') {
          if (!drag.wasSnapped) {
            onSnapTriggered();
            drag.wasSnapped = true;
          }
          setSnapPoints(snapRes.snapPoints);
          onUpdatePiece(
            drag.pieceId,
            snapRes.snappedPosition,
            snapRes.snappedRotation ?? drag.startRot,
          );
          return;
        }
      }

      drag.wasSnapped = false;
      setSnapPoints([]);
      onUpdatePiece(drag.pieceId, rawPos, drag.startRot);
    } else if (drag.kind === 'rotate') {
      const currentAngle = radToDeg(
        Math.atan2(pt.y - drag.center.y, pt.x - drag.center.x),
      );
      const delta = currentAngle - drag.startPointerAngle;
      const nextRot = normalizeAngle(drag.startPieceRot + delta);
      const active = pieces.find((p) => p.id === drag.pieceId);
      if (active) {
        onUpdatePiece(drag.pieceId, active.position, Math.round(nextRot * 10) / 10);
      }
    }
  };

  const handlePointerUp = () => {
    dragRef.current = { kind: 'none' };
    setSnapPoints([]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isLocked || !selectedId) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    const step = e.shiftKey ? 1 : angleStep;
    onRotateBy(selectedId, dir * step);
  };

  // Render selected piece on top
  const orderedPieces = [...pieces].sort((a, b) => {
    if (a.id === selectedId) return 1;
    if (b.id === selectedId) return -1;
    return 0;
  });

  const selectedPiece = pieces.find((p) => p.id === selectedId) ?? null;

  // Compute handle ring radius for selected piece
  const handleRadius = selectedPiece
    ? Math.max(
        68,
        Math.max(
          ...selectedPiece.localVertices.map((v) => Math.hypot(v.x, v.y)),
        ) + 22,
      )
    : 75;

  const handleRad = selectedPiece ? (selectedPiece.rotation * Math.PI) / 180 : 0;
  const knobPos = selectedPiece
    ? {
        x: selectedPiece.position.x + Math.cos(handleRad - Math.PI / 2) * handleRadius,
        y: selectedPiece.position.y + Math.sin(handleRad - Math.PI / 2) * handleRadius,
      }
    : null;

  // Symmetry axis line endpoints across the board
  const activeAxis =
    revealedAxis ?? (validation.isSolved ? validation.symmetryAxis : null);
  const axisLine = (() => {
    if (!activeAxis) return null;
    const { origin, angle } = activeAxis;
    const len = 1000;
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;
    return {
      x1: origin.x - dx,
      y1: origin.y - dy,
      x2: origin.x + dx,
      y2: origin.y + dy,
    };
  })();

  return (
    <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-slate-950/60">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-full max-h-full select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerDown={() => onSelectPiece(null)}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid-small" width="25" height="25" patternUnits="userSpaceOnUse">
            <path
              d="M 25 0 L 0 0 0 25"
              fill="none"
              stroke="rgba(148, 163, 184, 0.07)"
              strokeWidth="1"
            />
          </pattern>
          <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grid-small)" />
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth="1"
            />
          </pattern>
          <filter id="glow-solved" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Board Background */}
        <rect
          x={0}
          y={0}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          fill="url(#grid-large)"
          rx={12}
        />

        {/* Subtle center crosshair */}
        <line
          x1={BOARD_WIDTH / 2 - 14}
          y1={BOARD_HEIGHT / 2}
          x2={BOARD_WIDTH / 2 + 14}
          y2={BOARD_HEIGHT / 2}
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth={1.5}
        />
        <line
          x1={BOARD_WIDTH / 2}
          y1={BOARD_HEIGHT / 2 - 14}
          x2={BOARD_WIDTH / 2}
          y2={BOARD_HEIGHT / 2 + 14}
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth={1.5}
        />

        {/* Solved Outer Silhouette & Interior Holes Glow */}
        {validation.isSolved && validation.unionShape && (
          <g className="pointer-events-none">
            <path
              d={toPathD(validation.unionShape.outer)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={4}
              filter="url(#glow-solved)"
            />
            {validation.unionShape.holes.map((hole, idx) => (
              <path
                key={`hole-${idx}`}
                d={toPathD(hole)}
                fill="rgba(15, 23, 42, 0.55)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                filter="url(#glow-solved)"
              />
            ))}
          </g>
        )}

        {/* Polygon Pieces */}
        {orderedPieces.map((piece) => {
          const worldVerts = getWorldVertices(piece);
          const isSelected = piece.id === selectedId;
          return (
            <g
              key={piece.id}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePiecePointerDown(e, piece)}
            >
              <path
                d={toPathD(worldVerts)}
                fill={piece.color}
                fillOpacity={validation.isSolved ? 0.88 : isSelected ? 0.85 : 0.72}
                stroke={
                  validation.hasOverlap
                    ? '#ef4444'
                    : isSelected
                      ? '#ffffff'
                      : 'rgba(255,255,255,0.65)'
                }
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeLinejoin="round"
              />
              {/* Vertex dots */}
              {worldVerts.map((v, idx) => (
                <circle
                  key={idx}
                  cx={v.x}
                  cy={v.y}
                  r={isSelected ? 3.5 : 2.2}
                  fill="#ffffff"
                  fillOpacity={0.85}
                  className="pointer-events-none"
                />
              ))}
              {/* Piece centroid pivot dot */}
              <circle
                cx={piece.position.x}
                cy={piece.position.y}
                r={3}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth={1.2}
                className="pointer-events-none"
              />
            </g>
          );
        })}

        {/* Rotation Ring & Handle for Selected Piece */}
        {selectedPiece && knobPos && !validation.isSolved && !isLocked && (
          <g>
            <circle
              cx={selectedPiece.position.x}
              cy={selectedPiece.position.y}
              r={handleRadius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              className="pointer-events-none"
            />
            <line
              x1={selectedPiece.position.x}
              y1={selectedPiece.position.y}
              x2={knobPos.x}
              y2={knobPos.y}
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth={1.2}
              strokeDasharray="3 3"
              className="pointer-events-none"
            />
            <g
              className="cursor-pointer"
              onPointerDown={(e) => handleRotatePointerDown(e, selectedPiece)}
            >
              {/* Larger invisible hit target for touch */}
              <circle cx={knobPos.x} cy={knobPos.y} r={20} fill="transparent" />
              <circle
                cx={knobPos.x}
                cy={knobPos.y}
                r={10}
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          </g>
        )}

        {/* Magnetic Snap Indicator */}
        {snapPoints.map((sp, i) => (
          <g key={i} className="pointer-events-none">
            <circle
              cx={sp.x}
              cy={sp.y}
              r={9}
              fill="none"
              stroke="#34d399"
              strokeWidth={2}
            />
            <circle cx={sp.x} cy={sp.y} r={3} fill="#34d399" />
          </g>
        ))}

        {/* Symmetry Axis Line when Solved */}
        {axisLine && (
          <line
            x1={axisLine.x1}
            y1={axisLine.y1}
            x2={axisLine.x2}
            y2={axisLine.y2}
            stroke="#fbbf24"
            strokeWidth={2.5}
            strokeDasharray="10 6"
            filter="url(#glow-solved)"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
};
