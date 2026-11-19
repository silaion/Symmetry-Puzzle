import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Eye,
  Globe,
  HelpCircle,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { generatePuzzle } from './engine/generator.ts';
import { normalizeAngle } from './engine/geometry.ts';
import { validatePuzzleState } from './engine/symmetry.ts';
import type { Difficulty, Piece, Point, PuzzleData } from './engine/types.ts';
import { TRANSLATIONS } from './i18n/translations.ts';
import type { Language } from './i18n/translations.ts';
import { useSound } from './hooks/useSound.ts';
import { useSolutionAnimation } from './hooks/useSolutionAnimation.ts';
import { usePeerRoom } from './network/usePeerRoom.ts';
import type { PlayerProgressStatus } from './network/types.ts';
import { PuzzleCanvas } from './components/PuzzleCanvas.tsx';
import { RotationControls } from './components/RotationControls.tsx';
import { PlayerListPanel } from './components/PlayerListPanel.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { MultiplayerModal } from './components/MultiplayerModal.tsx';
import { SolutionConfirmModal } from './components/SolutionConfirmModal.tsx';

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function App() {
  const [lang, setLang] = useState<Language>('ko');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [puzzle, setPuzzle] = useState<PuzzleData>(() => generatePuzzle('normal'));
  const [pieces, setPieces] = useState<Piece[]>(() => puzzle.pieces);
  const [selectedId, setSelectedId] = useState<string | null>(puzzle.pieces[0]?.id ?? null);
  const [angleStep, setAngleStep] = useState<number>(5);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [initialRoomParam] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() ?? '';
  });
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [multiOpen, setMultiOpen] = useState<boolean>(() => initialRoomParam.length > 0);
  const [solutionConfirmOpen, setSolutionConfirmOpen] = useState<boolean>(false);
  const [isForfeited, setIsForfeited] = useState<boolean>(false);

  const [roundStartedAt, setRoundStartedAt] = useState<number>(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [solvedElapsedMs, setSolvedElapsedMs] = useState<number | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<{ nickname: string; elapsedMs: number } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  const t = TRANSLATIONS[lang];
  const sound = useSound();
  const { animateToSolution, cancelAnimation } = useSolutionAnimation();
  const lastStatusRef = useRef<PlayerProgressStatus>('solving');

  const handleReceivePuzzle = useCallback((incoming: PuzzleData, startedAt: number) => {
    cancelAnimation();
    setPuzzle(incoming);
    setDifficulty(incoming.difficulty);
    setPieces(incoming.pieces.map((p) => ({ ...p, position: { ...p.position } })));
    setSelectedId(incoming.pieces[0]?.id ?? null);
    setRoundStartedAt(startedAt);
    setElapsedMs(0);
    setSolvedElapsedMs(null);
    setIsForfeited(false);
    setSolutionConfirmOpen(false);
    setWinnerInfo(null);
    setBannerDismissed(false);
    lastStatusRef.current = 'solving';
  }, [cancelAnimation]);

  const handlePlayerSolved = useCallback(
    (_playerId: string, nickname: string, ms: number) => {
      setWinnerInfo((prev) => prev ?? { nickname, elapsedMs: ms });
      sound.playRoundEnd();
    },
    [sound],
  );

  const peerRoom = usePeerRoom({
    onReceivePuzzle: handleReceivePuzzle,
    onPlayerSolved: handlePlayerSolved,
  });

  // Elapsed timer
  useEffect(() => {
    if (solvedElapsedMs !== null || isForfeited) return;
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - roundStartedAt);
    }, 100);
    return () => window.clearInterval(timer);
  }, [isForfeited, roundStartedAt, solvedElapsedMs]);

  const validation = useMemo(() => validatePuzzleState(pieces), [pieces]);

  // Trigger solved & progress sync
  useEffect(() => {
    if (isForfeited) return;
    if (validation.isSolved) {
      if (solvedElapsedMs === null) {
        const finalMs = Date.now() - roundStartedAt;
        setSolvedElapsedMs(finalMs);
        setElapsedMs(finalMs);
        sound.playSolved();
        if (lastStatusRef.current !== 'solved') {
          lastStatusRef.current = 'solved';
          peerRoom.sendProgress('solved', finalMs);
        }
      }
      return;
    }

    const nextStatus: PlayerProgressStatus =
      validation.connectedCount >= 2 && !validation.hasOverlap ? 'combining' : 'solving';
    if (nextStatus !== lastStatusRef.current) {
      lastStatusRef.current = nextStatus;
      peerRoom.sendProgress(nextStatus, null);
    }
  }, [isForfeited, peerRoom, roundStartedAt, solvedElapsedMs, sound, validation]);

  const startNewPuzzle = useCallback(
    (targetDiff: Difficulty) => {
      if (peerRoom.mode === 'client') return;
      const next = generatePuzzle(targetDiff);
      const now = Date.now();
      handleReceivePuzzle(next, now);
      if (peerRoom.mode === 'host') {
        peerRoom.broadcastNewPuzzle(next, now);
      }
    },
    [handleReceivePuzzle, peerRoom],
  );

  const handleChangeDifficulty = (nextDiff: Difficulty) => {
    if (peerRoom.mode === 'client') return;
    setDifficulty(nextDiff);
    startNewPuzzle(nextDiff);
  };

  const handleResetPieces = () => {
    if (isForfeited) return;
    setPieces(puzzle.pieces.map((p) => ({ ...p, position: { ...p.position } })));
    setSolvedElapsedMs(null);
    setBannerDismissed(false);
    lastStatusRef.current = 'solving';
    peerRoom.sendProgress('solving', null);
  };

  const handleConfirmSolution = useCallback(() => {
    setSolutionConfirmOpen(false);
    setIsForfeited(true);
    setBannerDismissed(false);
    setSelectedId(null);
    lastStatusRef.current = 'forfeited';
    sound.playShowSolution();
    peerRoom.sendForfeit();
    animateToSolution(pieces, puzzle.solution, setPieces);
  }, [animateToSolution, peerRoom, pieces, puzzle.solution, sound]);

  const handleSelectPiece = useCallback(
    (id: string | null) => {
      if (id && id !== selectedId) {
        sound.playSelect();
      }
      setSelectedId(id);
    },
    [selectedId, sound],
  );

  const handleUpdatePiece = useCallback((id: string, position: Point, rotation: number) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, position, rotation: normalizeAngle(rotation) } : p)),
    );
  }, []);

  const handleRotateBy = useCallback(
    (id: string, deltaDeg: number) => {
      sound.playRotate();
      setPieces((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, rotation: normalizeAngle(p.rotation + deltaDeg) } : p,
        ),
      );
    },
    [sound],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1' && pieces[0]) handleSelectPiece(pieces[0].id);
      if (e.key === '2' && pieces[1]) handleSelectPiece(pieces[1].id);
      if (e.key === '3' && pieces[2]) handleSelectPiece(pieces[2].id);

      if (!selectedId || isForfeited) return;
      const step = e.shiftKey ? 1 : angleStep;
      if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleRotateBy(selectedId, -step);
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleRotateBy(selectedId, step);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [angleStep, handleRotateBy, handleSelectPiece, isForfeited, pieces, selectedId]);

  const selectedPiece = pieces.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none">
      {/* Top Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
              {t.appTitle}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {(['easy', 'normal', 'hard'] as const).map((diff) => (
            <button
              key={diff}
              type="button"
              disabled={peerRoom.mode === 'client'}
              onClick={() => handleChangeDifficulty(diff)}
              title={t.difficulty[`${diff}Desc`]}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                difficulty === diff
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white disabled:opacity-60'
              }`}
            >
              {t.difficulty[diff]}
            </button>
          ))}
        </div>

        {/* Right Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Elapsed Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTimer(elapsedMs)}</span>
          </div>

          {/* Multiplayer Button */}
          <button
            type="button"
            onClick={() => setMultiOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
              peerRoom.mode !== 'solo'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {peerRoom.mode === 'solo' ? t.multiplayer.soloMode : peerRoom.roomCode}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => sound.setSoundEnabled((v) => !v)}
            title={t.controls.soundToggle}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            {sound.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-sky-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === 'ko' ? 'en' : prev === 'en' ? 'ja' : 'ko'))}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 uppercase transition"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang}</span>
          </button>

          {/* Rules Button */}
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            title={t.controls.rules}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* Multiplayer Player Status Panel (No minimaps) */}
      {peerRoom.mode !== 'solo' && (
        <PlayerListPanel t={t} players={peerRoom.players} myId={peerRoom.myId} />
      )}

      {/* Winner Banner in Multiplayer */}
      {winnerInfo && peerRoom.mode !== 'solo' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-amber-300 font-semibold">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>
            {winnerInfo.nickname}
            {t.multiplayer.winnerBanner} ({formatTimer(winnerInfo.elapsedMs)})
          </span>
        </div>
      )}

      {/* Main Board Area */}
      <main className="relative flex-1 flex flex-col min-h-0">
        <PuzzleCanvas
          pieces={pieces}
          selectedId={selectedId}
          snapEnabled={snapEnabled}
          angleStep={angleStep}
          validation={validation}
          isLocked={isForfeited}
          revealedAxis={isForfeited ? puzzle.solution.symmetryAxis : null}
          onSelectPiece={handleSelectPiece}
          onUpdatePiece={handleUpdatePiece}
          onRotateBy={handleRotateBy}
          onSnapTriggered={sound.playSnap}
        />

        {/* Subtle Control Hint */}
        <div className="pointer-events-none absolute top-2.5 left-3 hidden sm:block text-[11px] text-slate-500 bg-slate-950/70 px-2.5 py-1 rounded-md border border-slate-800/60">
          {t.controls.wheelHint}
        </div>

        {/* Solved Toast Card */}
        {validation.isSolved && !isForfeited && !bannerDismissed && (
          <div className="absolute bottom-4 right-4 z-20 max-w-xs bg-slate-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Sparkles className="w-5 h-5" />
                <span>{t.validation.solved}</span>
              </div>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              {t.validation.solvedSub}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-emerald-300 font-semibold">
                {formatTimer(solvedElapsedMs ?? elapsedMs)}
              </span>
              {peerRoom.mode !== 'client' ? (
                <button
                  type="button"
                  onClick={() => startNewPuzzle(difficulty)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                >
                  {peerRoom.mode === 'host'
                    ? t.multiplayer.startNewRound
                    : t.validation.nextPuzzle}
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">{t.multiplayer.waitingHost}</span>
              )}
            </div>
          </div>
        )}

        {/* Forfeited / Solution Revealed Card */}
        {isForfeited && !bannerDismissed && (
          <div className="absolute bottom-4 right-4 z-20 max-w-xs bg-slate-900/95 border border-rose-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-base">
                <Eye className="w-5 h-5" />
                <span>{t.solution.revealedTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              {t.solution.revealedSub}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              {peerRoom.mode !== 'client' ? (
                <button
                  type="button"
                  onClick={() => startNewPuzzle(difficulty)}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                >
                  {peerRoom.mode === 'host'
                    ? t.multiplayer.startNewRound
                    : t.validation.nextPuzzle}
                </button>
              ) : (
                <span className="text-[11px] text-rose-300/90">
                  {t.solution.spectatingNotice}
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <RotationControls
        t={t}
        selectedPiece={selectedPiece}
        angleStep={angleStep}
        snapEnabled={snapEnabled}
        validation={validation}
        isClientMode={peerRoom.mode === 'client'}
        isForfeited={isForfeited}
        onChangeAngleStep={setAngleStep}
        onToggleSnap={() => setSnapEnabled((v) => !v)}
        onRotate={(delta) => {
          if (selectedId && !isForfeited) handleRotateBy(selectedId, delta);
        }}
        onResetPieces={handleResetPieces}
        onShowSolution={() => setSolutionConfirmOpen(true)}
        onNewPuzzle={() => startNewPuzzle(difficulty)}
      />

      {/* Modals */}
      <RulesModal t={t} isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      <SolutionConfirmModal
        t={t}
        isOpen={solutionConfirmOpen}
        isMultiplayer={peerRoom.mode !== 'solo'}
        onCancel={() => setSolutionConfirmOpen(false)}
        onConfirm={handleConfirmSolution}
      />
      <MultiplayerModal
        t={t}
        isOpen={multiOpen}
        mode={peerRoom.mode}
        roomCode={peerRoom.roomCode}
        initialJoinCode={initialRoomParam}
        connecting={peerRoom.connecting}
        error={peerRoom.error}
        onClose={() => setMultiOpen(false)}
        onCreateRoom={(nick) => peerRoom.createRoom(nick, puzzle, roundStartedAt)}
        onJoinRoom={(nick, code) => peerRoom.joinRoom(nick, code)}
        onLeaveRoom={peerRoom.leaveRoom}
      />
    </div>
  );
}

export default App;
