import type { PuzzleData } from '../engine/types.ts';

export type PlayerProgressStatus = 'solving' | 'combining' | 'solved' | 'forfeited';

export interface RoomPlayer {
  id: string;
  nickname: string;
  isHost: boolean;
  connected: boolean;
  status: PlayerProgressStatus;
  solvedElapsedMs: number | null;
}

export type NetMessage =
  | { type: 'JOIN_REQUEST'; nickname: string }
  | { type: 'STATUS_UPDATE'; status: PlayerProgressStatus; solvedElapsedMs: number | null }
  | { type: 'FORFEIT' }
  | { type: 'ROOM_STATE'; players: RoomPlayer[]; puzzle: PuzzleData; roundStartedAt: number }
  | { type: 'NEW_PUZZLE'; puzzle: PuzzleData; roundStartedAt: number }
  | { type: 'PLAYER_SOLVED'; playerId: string; nickname: string; elapsedMs: number }
  | { type: 'ROOM_FULL' }
  | { type: 'HOST_LEFT' };

export type RoomMode = 'solo' | 'host' | 'client';
