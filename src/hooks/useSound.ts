import { useCallback, useRef, useState } from 'react';

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (!soundEnabled) return null;
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, [soundEnabled]);

  const playTone = useCallback(
    (freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08, delay = 0) => {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },
    [getContext],
  );

  const playSelect = useCallback(() => {
    playTone(520, 0.07, 'triangle', 0.06);
  }, [playTone]);

  const playSnap = useCallback(() => {
    playTone(760, 0.06, 'sine', 0.09);
    playTone(1040, 0.08, 'sine', 0.06, 0.03);
  }, [playTone]);

  const playRotate = useCallback(() => {
    playTone(420, 0.035, 'triangle', 0.035);
  }, [playTone]);

  const playSolved = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      playTone(n, 0.25, 'triangle', 0.1, idx * 0.08);
    });
  }, [playTone]);

  const playRoundEnd = useCallback(() => {
    playTone(587.33, 0.15, 'sine', 0.08, 0);
    playTone(440.0, 0.22, 'sine', 0.08, 0.12);
  }, [playTone]);

  const playShowSolution = useCallback(() => {
    playTone(392.0, 0.16, 'sine', 0.07, 0);
    playTone(493.88, 0.18, 'sine', 0.07, 0.08);
    playTone(587.33, 0.24, 'sine', 0.07, 0.16);
  }, [playTone]);

  return {
    soundEnabled,
    setSoundEnabled,
    playSelect,
    playSnap,
    playRotate,
    playSolved,
    playRoundEnd,
    playShowSolution,
  };
}
