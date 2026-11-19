export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  a: Point;
  b: Point;
}

/** Counter-clockwise simple closed polygon (first and last points are implicitly connected). */
export type Polygon = Point[];

/** A connected polygon outer boundary with zero or more interior holes. */
export interface PolygonWithHoles {
  outer: Polygon;
  holes: Polygon[];
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Piece {
  id: string;
  /** Local vertices centered around (0, 0). Handedness is immutable (reflection forbidden). */
  localVertices: Polygon;
  /** World position on the 800x600 logical board. */
  position: Point;
  /** Rotation in degrees [0, 360). */
  rotation: number;
  /** Fill color for visual distinction. */
  color: string;
}

export interface SymmetryAxis {
  /** A point lying on the symmetry axis (typically the polygon centroid). */
  origin: Point;
  /** Direction angle of the axis in radians [0, Math.PI). */
  angle: number;
}

export interface PieceSolution {
  pieceId: string;
  solutionPosition: Point;
  solutionRotation: number;
}

export interface PuzzleSolution {
  pieces: PieceSolution[];
  symmetryAxis: SymmetryAxis;
}

export interface PuzzleData {
  id: string;
  difficulty: Difficulty;
  pieces: Piece[];
  /** Reference symmetric target shape (outer + optional holes, centered at (0,0)). */
  targetShape: PolygonWithHoles;
  /** Ground-truth placement and symmetry axis preserved from reverse dissection. */
  solution: PuzzleSolution;
}

export interface SnapResult {
  snappedPosition: Point;
  snappedRotation?: number;
  snapType: 'none' | 'vertex' | 'edge';
  snapPoints: Point[];
}

export interface ValidationResult {
  isSolved: boolean;
  hasOverlap: boolean;
  overlapArea: number;
  isSingleConnected: boolean;
  hasHoles: boolean;
  isSymmetric: boolean;
  symmetryAxis: SymmetryAxis | null;
  unionShape: PolygonWithHoles | null;
  /** Number of pieces connected in the largest edge-adjacent component (1..3). */
  connectedCount: number;
}
