import React from 'react';
import { Magnet, RotateCcw, RotateCw, RefreshCw, Sparkles, ShieldBan, Eye } from 'lucide-react';
import type { Piece, ValidationResult } from '../engine/types.ts';
import type { TranslationDict } from '../i18n/translations.ts';

interface RotationControlsProps {
  t: TranslationDict;
  selectedPiece: Piece | null;
  angleStep: number;
  snapEnabled: boolean;
  validation: ValidationResult;
  isClientMode: boolean;
  isForfeited: boolean;
  onChangeAngleStep: (step: number) => void;
  onToggleSnap: () => void;
  onRotate: (deltaDeg: number) => void;
  onResetPieces: () => void;
  onShowSolution: () => void;
  onNewPuzzle: () => void;
}

export const RotationControls: React.FC<RotationControlsProps> = ({
  t,
  selectedPiece,
  angleStep,
  snapEnabled,
  validation,
  isClientMode,
  isForfeited,
  onChangeAngleStep,
  onToggleSnap,
  onRotate,
  onResetPieces,
  onShowSolution,
  onNewPuzzle,
}) => {
  const statusBanner = (() => {
    if (isForfeited) {
      return {
        text: t.solution.revealedTitle,
        cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      };
    }
    if (validation.isSolved) {
      return {
        text: t.validation.symmetryFound,
        cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }
    if (validation.hasOverlap) {
      return {
        text: t.validation.overlapError,
        cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    }
    if (!validation.isSingleConnected) {
      return {
        text: `${t.validation.notConnected} (${validation.connectedCount}/3)`,
        cls: 'bg-slate-800/80 text-slate-300 border-slate-700',
      };
    }
    return {
      text: t.validation.notSymmetric,
      cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    };
  })();

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
      {/* Left: Validation Status & No-Flip Notice */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${statusBanner.cls}`}
        >
          {validation.isSolved && <Sparkles className="w-3.5 h-3.5" />}
          <span>{statusBanner.text}</span>
        </div>
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/70 text-[11px] text-slate-400">
          <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
          <span>{t.controls.noFlipNotice}</span>
        </div>
      </div>

      {/* Center: Rotation Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          {[1, 5, 15].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => onChangeAngleStep(step)}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition ${
                angleStep === step
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {step}°
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!selectedPiece || isForfeited}
          onClick={() => onRotate(-angleStep)}
          title={t.controls.rotateLeft}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-xs font-medium text-slate-100 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>-{angleStep}°</span>
        </button>

        <div className="min-w-[64px] text-center px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300">
          {selectedPiece ? `${Math.round(selectedPiece.rotation)}°` : '—'}
        </div>

        <button
          type="button"
          disabled={!selectedPiece || isForfeited}
          onClick={() => onRotate(angleStep)}
          title={t.controls.rotateRight}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-xs font-medium text-slate-100 transition"
        >
          <span>+{angleStep}°</span>
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Snap, Reset, New Puzzle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSnap}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
            snapEnabled
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.controls.snapToggle}</span>
        </button>

        <button
          type="button"
          disabled={isForfeited}
          onClick={onResetPieces}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 text-xs font-medium text-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.controls.resetPieces}</span>
        </button>

        <button
          type="button"
          disabled={isForfeited || validation.isSolved}
          onClick={onShowSolution}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 disabled:pointer-events-none border border-rose-500/40 text-rose-300 text-xs font-semibold transition"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t.solution.showBtn}</span>
        </button>

        {!isClientMode && (
          <button
            type="button"
            onClick={onNewPuzzle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
          >
            <span>{t.controls.newPuzzle}</span>
          </button>
        )}
      </div>
    </div>
  );
};
