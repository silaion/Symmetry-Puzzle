import React from 'react';
import { Crown, CheckCircle2, Loader2, Puzzle, Flag } from 'lucide-react';
import type { RoomPlayer } from '../network/types.ts';
import type { TranslationDict } from '../i18n/translations.ts';

interface PlayerListPanelProps {
  t: TranslationDict;
  players: RoomPlayer[];
  myId: string;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export const PlayerListPanel: React.FC<PlayerListPanelProps> = ({ t, players, myId }) => {
  if (players.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
        {t.multiplayer.playersCount} ({players.length}/3)
      </span>

      <div className="flex items-center gap-2">
        {players.map((p) => {
          const isMe = p.id === myId;
          const badge = (() => {
            if (p.status === 'forfeited') {
              return {
                label: t.multiplayer.statusForfeited,
                cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
                icon: <Flag className="w-3 h-3" />,
              };
            }
            if (p.status === 'solved') {
              return {
                label: t.multiplayer.statusSolved,
                cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                icon: <CheckCircle2 className="w-3 h-3" />,
              };
            }
            if (p.status === 'combining') {
              return {
                label: t.multiplayer.statusCombining,
                cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                icon: <Puzzle className="w-3 h-3" />,
              };
            }
            return {
              label: t.multiplayer.statusSolving,
              cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
              icon: <Loader2 className="w-3 h-3 animate-spin" />,
            };
          })();

          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${
                isMe
                  ? 'bg-slate-800/90 border-amber-500/40'
                  : 'bg-slate-900 border-slate-700/80'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  p.connected ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <span className="font-semibold text-slate-100 flex items-center gap-1">
                {p.isHost && <Crown className="w-3 h-3 text-amber-400" />}
                {p.nickname}
                {isMe && (
                  <span className="text-[10px] text-amber-300 font-normal">
                    ({t.multiplayer.youBadge})
                  </span>
                )}
              </span>

              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium ${badge.cls}`}
              >
                {badge.icon}
                {badge.label}
              </span>

              {p.solvedElapsedMs !== null && (
                <span className="font-mono text-[11px] text-emerald-300">
                  {formatMs(p.solvedElapsedMs)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
