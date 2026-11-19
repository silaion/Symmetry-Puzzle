import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Users, LogOut, Loader2, Link2 } from 'lucide-react';
import type { RoomMode } from '../network/types.ts';
import type { TranslationDict } from '../i18n/translations.ts';

interface MultiplayerModalProps {
  t: TranslationDict;
  isOpen: boolean;
  mode: RoomMode;
  roomCode: string;
  initialJoinCode?: string;
  connecting: boolean;
  error: string | null;
  onClose: () => void;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (nickname: string, code: string) => void;
  onLeaveRoom: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  t,
  isOpen,
  mode,
  roomCode,
  initialJoinCode = '',
  connecting,
  error,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}) => {
  const [nickname, setNickname] = useState('Player');
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode);
    }
  }, [initialJoinCode]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyLink = async () => {
    if (!roomCode) return;
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const inviteUrl = `${window.location.origin}${baseUrl}?room=${encodeURIComponent(roomCode)}`;
    await navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };

  const errorMessage =
    error === 'roomFullError'
      ? t.multiplayer.roomFullError
      : error === 'connectionError'
        ? t.multiplayer.connectionError
        : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            {t.multiplayer.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode !== 'solo' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">{t.multiplayer.roomCode}</div>
                  <div className="text-2xl font-mono font-bold text-amber-400 tracking-wider">
                    {roomCode}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t.multiplayer.copied : t.multiplayer.copyCode}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-medium text-sky-300 transition"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                    {linkCopied ? t.multiplayer.linkCopied : t.multiplayer.copyLink}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLeaveRoom();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-sm transition"
              >
                <LogOut className="w-4 h-4" />
                {t.multiplayer.leaveBtn}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.multiplayer.nickname}
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  disabled={connecting}
                  onClick={() => onCreateRoom(nickname)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                >
                  {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.multiplayer.createBtn}
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-3 text-xs text-slate-500">OR</span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder={t.multiplayer.roomCodePlaceholder}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  disabled={connecting || !joinCode.trim()}
                  onClick={() => onJoinRoom(nickname, joinCode)}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition"
                >
                  {t.multiplayer.joinBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
