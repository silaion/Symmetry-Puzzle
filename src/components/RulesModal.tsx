import React from 'react';
import { X, Target, Gamepad2, CheckSquare, Ban } from 'lucide-react';
import type { TranslationDict } from '../i18n/translations.ts';

interface RulesModalProps {
  t: TranslationDict;
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ t, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">{t.rulesModal.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-sm text-slate-300">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-amber-400 flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t.rulesModal.objectiveTitle}
            </h3>
            <p className="leading-relaxed text-slate-300">{t.rulesModal.objectiveDesc}</p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-sky-400 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              {t.rulesModal.controlsTitle}
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {t.rulesModal.controlsList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              {t.rulesModal.winConditionsTitle}
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {t.rulesModal.winConditionsList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-rose-400 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              {t.rulesModal.prohibitedTitle}
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {t.rulesModal.prohibitedList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
          >
            {t.rulesModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
