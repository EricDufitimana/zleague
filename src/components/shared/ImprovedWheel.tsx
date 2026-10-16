'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

interface Team {
  id: number;
  name: string;
  grade: string;
  gender: string;
  created_at: string;
}

export interface WheelHandle {
  /** Starts a spin. No-ops while a spin is already running. */
  spin: () => void;
  /** Snaps the wheel back to its starting position. */
  reset: () => void;
  /** True while a spin is in flight. */
  isSpinning: () => boolean;
}

interface ImprovedWheelProps {
  teams: Team[];
  onSelectWinner?: (winner: Team) => void;
  onSpinStart?: () => void;
  onSpinComplete?: () => void;
  size?: number;
  disabled?: boolean;
  largeText?: boolean;
  soundEnabled?: boolean;
  /**
   * Deprecated. The wheel tracks its own spin state internally; a parent's
   * `isSpinning` arrives a render late, which used to let a second click start
   * a competing animation. Kept so existing call sites still compile.
   */
  isSpinning?: boolean;
}

const TWO_PI = Math.PI * 2;

/** Always-positive modulo. */
const mod = (value: number, m: number) => ((value % m) + m) % m;

/**
 * Index of the slice under the pointer.
 *
 * Slices are drawn from angle 0 (the +x axis, i.e. 3 o'clock) going clockwise,
 * with the whole wheel offset by `rotation`. The pointer sits at the top, which
 * is -PI/2 in canvas coordinates, so the slice under it is the one whose
 * un-rotated span contains (-PI/2 - rotation).
 */
export function winnerIndexAt(rotation: number, sliceCount: number): number {
  if (sliceCount <= 0) return -1;
  const arc = TWO_PI / sliceCount;
  return Math.floor(mod(-Math.PI / 2 - rotation, TWO_PI) / arc) % sliceCount;
}

const SLICE_COLORS = [
  '#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2',
  '#ca8a04', '#db2777', '#4f46e5', '#059669', '#ea580c', '#b91c1c',
  '#9333ea', '#0e7490', '#a16207', '#be185d',
];

export const ImprovedWheel = forwardRef<WheelHandle, ImprovedWheelProps>(
  function ImprovedWheel(
    {
      teams,
      onSelectWinner,
      onSpinStart,
      onSpinComplete,
      size = 400,
      disabled = false,
      largeText = false,
      soundEnabled = true,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rotationRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const spinningRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastClickAtRef = useRef(0);

    // Callbacks are read through a ref so the animation loop never closes over
    // a stale copy, and so changing a handler mid-spin cannot restart anything.
    const handlersRef = useRef({ onSelectWinner, onSpinStart, onSpinComplete });
    handlersRef.current = { onSelectWinner, onSpinStart, onSpinComplete };

    const teamsRef = useRef(teams);
    teamsRef.current = teams;

    const spinnable = teams.length >= 2 && !disabled;

    const playTick = useCallback(() => {
      try {
        if (!audioContextRef.current) {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (!Ctor) return;
          audioContextRef.current = new Ctor();
        }
        const ctx = audioContextRef.current;
        // Autoplay policies suspend contexts created outside a gesture.
        if (ctx.state === 'suspended') void ctx.resume();

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.Q.setValueAtTime(1, now);

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(120, now);
        osc1.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(240, now);
        osc2.frequency.exponentialRampToValueAtTime(160, now + 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.08);
        osc2.stop(now + 0.08);
      } catch {
        // Sound is decorative - never let it break a spin.
      }
    }, []);

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const list = teamsRef.current;
      const dpr = window.devicePixelRatio || 1;

      // Keep the backing store in step with the current device pixel ratio.
      // devicePixelRatio changes when the window moves to a different monitor
      // or the page is zoomed; if the buffer is not resized to match, the
      // transform below scales the drawing past the edge of the canvas and the
      // wheel renders clipped. Resizing only on mismatch keeps this off the hot
      // path - the old version reallocated the buffer 60 times a second.
      const target = Math.round(size * dpr);
      if (canvas.width !== target || canvas.height !== target) {
        canvas.width = target;
        canvas.height = target;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const center = size / 2;
      const radius = center - 6;
      const hubRadius = Math.max(24, size * 0.075);
      const rotation = rotationRef.current;

      // Rim
      ctx.beginPath();
      ctx.arc(center, center, radius + 4, 0, TWO_PI);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();

      if (list.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No teams available', center, center);
        return;
      }

      const arc = TWO_PI / list.length;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotation);

      list.forEach((team, i) => {
        const start = i * arc;
        const end = start + arc;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label, laid out along the slice's centre line. It is painted onto the
        // wheel and turns with it, exactly like a physical prize wheel.
        //
        // The half-turn below is decided from `mid` - the slice's own angle,
        // which never changes - and NOT from (rotation + mid). Keying it off the
        // live screen angle flips a label 180 degrees the instant it crosses the
        // vertical, which during a spin reads as the text snapping or shifting.
        // Deciding it per slice keeps every label fixed to its wedge, and still
        // leaves the whole wheel upright at rest and after reset().
        ctx.save();
        const mid = start + arc / 2;
        ctx.rotate(mid);
        ctx.translate(radius * 0.58, 0);
        if (mid > Math.PI / 2 && mid < (3 * Math.PI) / 2) {
          ctx.rotate(Math.PI);
        }

        const fontSize = Math.max(
          10,
          Math.min(largeText ? 22 : 17, (largeText ? 260 : 210) / Math.max(5, list.length))
        );
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const maxChars = largeText ? 20 : 17;
        const label =
          team.name.length > maxChars ? `${team.name.slice(0, maxChars - 1)}…` : team.name;

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      ctx.restore();

      // Hub
      ctx.beginPath();
      ctx.arc(center, center, hubRadius, 0, TWO_PI);
      const hub = ctx.createRadialGradient(
        center - hubRadius * 0.3,
        center - hubRadius * 0.3,
        0,
        center,
        center,
        hubRadius
      );
      hub.addColorStop(0, '#ffffff');
      hub.addColorStop(1, '#e8ecf2');
      ctx.fillStyle = hub;
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pointer at 12 o'clock - must stay in sync with winnerIndexAt().
      ctx.beginPath();
      ctx.moveTo(center - 12, 2);
      ctx.lineTo(center + 12, 2);
      ctx.lineTo(center, 30);
      ctx.closePath();
      ctx.fillStyle = '#e11d48';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }, [size, largeText]);

    // Initial render, and whenever the requested size changes. draw() sizes the
    // backing store itself, so a device-pixel-ratio change is picked up too.
    useEffect(() => {
      draw();
    }, [size, draw]);

    // An idle wheel would otherwise stay mis-sized until the next draw if the
    // window moved to a monitor with a different pixel ratio, or the page was
    // zoomed. There is no dpr event, so watch a resolution media query and
    // re-arm it at the new ratio each time it fires.
    useEffect(() => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

      let media: MediaQueryList | null = null;
      let disposed = false;

      const onChange = () => {
        draw();
        attach();
      };

      const attach = () => {
        if (disposed) return;
        media?.removeEventListener('change', onChange);
        media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
        media.addEventListener('change', onChange);
      };

      attach();
      return () => {
        disposed = true;
        media?.removeEventListener('change', onChange);
      };
    }, [draw]);

    // Redraw when the team list changes (but never mid-spin, which would make
    // the landed winner disagree with what is under the pointer).
    useEffect(() => {
      if (!spinningRef.current) draw();
    }, [teams, draw]);

    const spin = useCallback(() => {
      const list = teamsRef.current;
      if (spinningRef.current || disabled || list.length < 2) return;

      spinningRef.current = true;
      handlersRef.current.onSpinStart?.();

      const sliceCount = list.length;
      const arc = TWO_PI / sliceCount;
      // Continue from the current angle so the wheel never teleports; the old
      // version jumped to a random angle the instant you clicked.
      const from = rotationRef.current;
      const turns = 6 + Math.random() * 2;
      const to = from + turns * TWO_PI + Math.random() * TWO_PI;
      const duration = 5200 + Math.random() * 600;
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const previous = rotationRef.current;
        rotationRef.current = from + (to - from) * eased;

        if (soundEnabled && progress > 0.02 && progress < 0.97) {
          const crossed =
            Math.floor(rotationRef.current / arc) !== Math.floor(previous / arc);
          if (crossed && now - lastClickAtRef.current > 45) {
            playTick();
            lastClickAtRef.current = now;
          }
        }

        draw();

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
          return;
        }

        rafRef.current = null;
        spinningRef.current = false;

        const index = winnerIndexAt(rotationRef.current, sliceCount);
        const winner = list[index];
        if (winner) handlersRef.current.onSelectWinner?.(winner);
        handlersRef.current.onSpinComplete?.();
      };

      rafRef.current = requestAnimationFrame(step);
    }, [disabled, soundEnabled, draw, playTick]);

    const reset = useCallback(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      spinningRef.current = false;
      rotationRef.current = 0;
      draw();
    }, [draw]);

    useImperativeHandle(ref, () => ({ spin, reset, isSpinning: () => spinningRef.current }), [
      spin,
      reset,
    ]);

    useEffect(() => {
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        void audioContextRef.current?.close();
        audioContextRef.current = null;
      };
    }, []);

    return (
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          role="button"
          tabIndex={spinnable ? 0 : -1}
          aria-label={spinnable ? 'Spin the wheel' : 'Wheel unavailable'}
          aria-disabled={!spinnable}
          className="block rounded-full shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            cursor: spinnable ? 'pointer' : 'not-allowed',
            opacity: spinnable ? 1 : 0.5,
            touchAction: 'manipulation',
          }}
          onClick={spin}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              spin();
            }
          }}
        />
      </div>
    );
  }
);
