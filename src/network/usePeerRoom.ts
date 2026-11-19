import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { PuzzleData } from '../engine/types.ts';
import type { NetMessage, PlayerProgressStatus, RoomMode, RoomPlayer } from './types.ts';

const PEER_PREFIX = 'sympzl-v1-';
const MAX_CLIENTS = 2; // Host + 2 clients = 3 players max

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return `SYM-${code}`;
}

function normalizeRoomCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (cleaned.startsWith('SYM-')) return cleaned;
  return `SYM-${cleaned.replace(/^SYM/, '')}`;
}

interface UsePeerRoomOptions {
  onReceivePuzzle: (puzzle: PuzzleData, roundStartedAt: number) => void;
  onPlayerSolved: (playerId: string, nickname: string, elapsedMs: number) => void;
}

export function usePeerRoom({ onReceivePuzzle, onPlayerSolved }: UsePeerRoomOptions) {
  const [mode, setMode] = useState<RoomMode>('solo');
  const [roomCode, setRoomCode] = useState<string>('');
  const [myId, setMyId] = useState<string>('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const hostConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const clientConnRef = useRef<DataConnection | null>(null);
  const playersRef = useRef<RoomPlayer[]>([]);
  const currentPuzzleRef = useRef<PuzzleData | null>(null);
  const roundStartedAtRef = useRef<number>(Date.now());

  const onReceivePuzzleRef = useRef(onReceivePuzzle);
  onReceivePuzzleRef.current = onReceivePuzzle;
  const onPlayerSolvedRef = useRef(onPlayerSolved);
  onPlayerSolvedRef.current = onPlayerSolved;

  const updatePlayers = useCallback((next: RoomPlayer[]) => {
    playersRef.current = next;
    setPlayers(next);
  }, []);

  const broadcastFromHost = useCallback((msg: NetMessage) => {
    for (const conn of hostConnsRef.current.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (clientConnRef.current) {
      clientConnRef.current.close();
      clientConnRef.current = null;
    }
    for (const conn of hostConnsRef.current.values()) {
      if (conn.open) {
        conn.send({ type: 'HOST_LEFT' } satisfies NetMessage);
        conn.close();
      }
    }
    hostConnsRef.current.clear();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setMode('solo');
    setRoomCode('');
    setMyId('');
    setConnecting(false);
    setError(null);
    updatePlayers([]);
  }, [updatePlayers]);

  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const createRoom = useCallback(
    (nickname: string, initialPuzzle: PuzzleData, roundStartedAt: number) => {
      leaveRoom();
      setConnecting(true);
      setError(null);

      const code = generateRoomCode();
      const peerId = `${PEER_PREFIX}${code}`;
      const peer = new Peer(peerId);
      peerRef.current = peer;
      currentPuzzleRef.current = initialPuzzle;
      roundStartedAtRef.current = roundStartedAt;

      peer.on('open', (id) => {
        setMode('host');
        setRoomCode(code);
        setMyId(id);
        setConnecting(false);
        const hostPlayer: RoomPlayer = {
          id,
          nickname: nickname.trim() || 'Host',
          isHost: true,
          connected: true,
          status: 'solving',
          solvedElapsedMs: null,
        };
        updatePlayers([hostPlayer]);
      });

      peer.on('connection', (conn) => {
        if (hostConnsRef.current.size >= MAX_CLIENTS) {
          conn.on('open', () => {
            conn.send({ type: 'ROOM_FULL' } satisfies NetMessage);
            setTimeout(() => conn.close(), 150);
          });
          return;
        }

        hostConnsRef.current.set(conn.peer, conn);

        conn.on('data', (raw) => {
          const msg = raw as NetMessage;
          if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

          if (msg.type === 'JOIN_REQUEST') {
            const newPlayer: RoomPlayer = {
              id: conn.peer,
              nickname: msg.nickname.trim() || 'Player',
              isHost: false,
              connected: true,
              status: 'solving',
              solvedElapsedMs: null,
            };
            const nextList = [
              ...playersRef.current.filter((p) => p.id !== conn.peer),
              newPlayer,
            ];
            updatePlayers(nextList);

            if (currentPuzzleRef.current) {
              const stateMsg: NetMessage = {
                type: 'ROOM_STATE',
                players: nextList,
                puzzle: currentPuzzleRef.current,
                roundStartedAt: roundStartedAtRef.current,
              };
              broadcastFromHost(stateMsg);
            }
          } else if (msg.type === 'STATUS_UPDATE') {
            const nextList = playersRef.current.map((p) =>
              p.id === conn.peer
                ? { ...p, status: msg.status, solvedElapsedMs: msg.solvedElapsedMs }
                : p,
            );
            updatePlayers(nextList);

            if (currentPuzzleRef.current) {
              broadcastFromHost({
                type: 'ROOM_STATE',
                players: nextList,
                puzzle: currentPuzzleRef.current,
                roundStartedAt: roundStartedAtRef.current,
              });
            }

            if (msg.status === 'solved' && msg.solvedElapsedMs !== null) {
              const solver = nextList.find((p) => p.id === conn.peer);
              if (solver) {
                broadcastFromHost({
                  type: 'PLAYER_SOLVED',
                  playerId: solver.id,
                  nickname: solver.nickname,
                  elapsedMs: msg.solvedElapsedMs,
                });
                onPlayerSolvedRef.current(solver.id, solver.nickname, msg.solvedElapsedMs);
              }
            }
          } else if (msg.type === 'FORFEIT') {
            const nextList = playersRef.current.map((p) =>
              p.id === conn.peer
                ? { ...p, status: 'forfeited' as const, solvedElapsedMs: null }
                : p,
            );
            updatePlayers(nextList);

            if (currentPuzzleRef.current) {
              broadcastFromHost({
                type: 'ROOM_STATE',
                players: nextList,
                puzzle: currentPuzzleRef.current,
                roundStartedAt: roundStartedAtRef.current,
              });
            }
          }
        });

        conn.on('close', () => {
          hostConnsRef.current.delete(conn.peer);
          const nextList = playersRef.current.filter((p) => p.id !== conn.peer);
          updatePlayers(nextList);
          if (currentPuzzleRef.current) {
            broadcastFromHost({
              type: 'ROOM_STATE',
              players: nextList,
              puzzle: currentPuzzleRef.current,
              roundStartedAt: roundStartedAtRef.current,
            });
          }
        });
      });

      peer.on('error', () => {
        setConnecting(false);
        setError('connectionError');
      });
    },
    [broadcastFromHost, leaveRoom, updatePlayers],
  );

  const joinRoom = useCallback(
    (nickname: string, rawCode: string) => {
      leaveRoom();
      const code = normalizeRoomCode(rawCode);
      if (code.length < 5) {
        setError('connectionError');
        return;
      }

      setConnecting(true);
      setError(null);

      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setMyId(id);
        const hostPeerId = `${PEER_PREFIX}${code}`;
        const conn = peer.connect(hostPeerId, { reliable: true });
        clientConnRef.current = conn;

        conn.on('open', () => {
          setMode('client');
          setRoomCode(code);
          setConnecting(false);
          conn.send({
            type: 'JOIN_REQUEST',
            nickname: nickname.trim() || 'Player',
          } satisfies NetMessage);
        });

        conn.on('data', (raw) => {
          const msg = raw as NetMessage;
          if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

          if (msg.type === 'ROOM_FULL') {
            setError('roomFullError');
            leaveRoom();
          } else if (msg.type === 'HOST_LEFT') {
            leaveRoom();
          } else if (msg.type === 'ROOM_STATE') {
            const isNewPuzzle =
              !currentPuzzleRef.current || currentPuzzleRef.current.id !== msg.puzzle.id;
            currentPuzzleRef.current = msg.puzzle;
            roundStartedAtRef.current = msg.roundStartedAt;
            updatePlayers(msg.players);
            if (isNewPuzzle) {
              onReceivePuzzleRef.current(msg.puzzle, msg.roundStartedAt);
            }
          } else if (msg.type === 'NEW_PUZZLE') {
            currentPuzzleRef.current = msg.puzzle;
            roundStartedAtRef.current = msg.roundStartedAt;
            updatePlayers(
              playersRef.current.map((p) => ({
                ...p,
                status: 'solving',
                solvedElapsedMs: null,
              })),
            );
            onReceivePuzzleRef.current(msg.puzzle, msg.roundStartedAt);
          } else if (msg.type === 'PLAYER_SOLVED') {
            onPlayerSolvedRef.current(msg.playerId, msg.nickname, msg.elapsedMs);
          }
        });

        conn.on('close', () => {
          if (mode === 'client') {
            leaveRoom();
          }
        });

        conn.on('error', () => {
          setConnecting(false);
          setError('connectionError');
        });
      });

      peer.on('error', () => {
        setConnecting(false);
        setError('connectionError');
      });
    },
    [leaveRoom, mode, updatePlayers],
  );

  const broadcastNewPuzzle = useCallback(
    (puzzle: PuzzleData, roundStartedAt: number) => {
      if (mode !== 'host') return;
      currentPuzzleRef.current = puzzle;
      roundStartedAtRef.current = roundStartedAt;
      const resetPlayers = playersRef.current.map((p) => ({
        ...p,
        status: 'solving' as const,
        solvedElapsedMs: null,
      }));
      updatePlayers(resetPlayers);
      broadcastFromHost({
        type: 'NEW_PUZZLE',
        puzzle,
        roundStartedAt,
      });
    },
    [broadcastFromHost, mode, updatePlayers],
  );

  const sendProgress = useCallback(
    (status: PlayerProgressStatus, solvedElapsedMs: number | null) => {
      if (mode === 'solo') return;

      if (mode === 'host') {
        const nextList = playersRef.current.map((p) =>
          p.id === myId ? { ...p, status, solvedElapsedMs } : p,
        );
        updatePlayers(nextList);
        if (currentPuzzleRef.current) {
          broadcastFromHost({
            type: 'ROOM_STATE',
            players: nextList,
            puzzle: currentPuzzleRef.current,
            roundStartedAt: roundStartedAtRef.current,
          });
        }
        if (status === 'solved' && solvedElapsedMs !== null) {
          const me = nextList.find((p) => p.id === myId);
          if (me) {
            broadcastFromHost({
              type: 'PLAYER_SOLVED',
              playerId: me.id,
              nickname: me.nickname,
              elapsedMs: solvedElapsedMs,
            });
            onPlayerSolvedRef.current(me.id, me.nickname, solvedElapsedMs);
          }
        }
      } else if (mode === 'client' && clientConnRef.current?.open) {
        clientConnRef.current.send({
          type: 'STATUS_UPDATE',
          status,
          solvedElapsedMs,
        } satisfies NetMessage);
      }
    },
    [broadcastFromHost, mode, myId, updatePlayers],
  );

  const sendForfeit = useCallback(() => {
    if (mode === 'solo') return;

    if (mode === 'host') {
      const nextList = playersRef.current.map((p) =>
        p.id === myId ? { ...p, status: 'forfeited' as const, solvedElapsedMs: null } : p,
      );
      updatePlayers(nextList);
      if (currentPuzzleRef.current) {
        broadcastFromHost({
          type: 'ROOM_STATE',
          players: nextList,
          puzzle: currentPuzzleRef.current,
          roundStartedAt: roundStartedAtRef.current,
        });
      }
    } else if (mode === 'client' && clientConnRef.current?.open) {
      clientConnRef.current.send({ type: 'FORFEIT' } satisfies NetMessage);
    }
  }, [broadcastFromHost, mode, myId, updatePlayers]);

  return {
    mode,
    roomCode,
    myId,
    players,
    connecting,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    broadcastNewPuzzle,
    sendProgress,
    sendForfeit,
  };
}
