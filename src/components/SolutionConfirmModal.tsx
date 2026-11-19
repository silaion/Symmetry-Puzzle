import React from 'react';
import { Eye, AlertTriangle, X } from 'lucide-react';
import type { TranslationDict } from '../i18n/translations.ts';

interface SolutionConfirmModalProps {
  t: TranslationDict;
  isOpen: boolean;
  isMultiplayer: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SolutionConfirmModal: React.FC<SolutionConfirmModalProps> = ({
  t,
  isOpen,
  isMultiplayer,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {t.solution.confirmTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-sm text-slate-300 leading-relaxed">
          {isMultiplayer ? t.solution.confirmMultiDesc : t.solution.confirmSoloDesc}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            {t.solution.cancelBtn}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition"
          >
            <Eye className="w-3.5 h-3.5" />
            {t.solution.confirmBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
