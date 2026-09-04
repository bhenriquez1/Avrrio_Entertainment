"use client";

import { useEffect, useRef } from "react";

// Brand palette
const MIDNIGHT = "#070b18";
const GOLD = "#f0b429";
const GOLD_GLOW = "rgba(240,180,41,";
const PEARL = "#c8cdd6";
const SPARK = "#b8c4e8";

type ParticleType = "gold" | "pearl" | "spark";

interface Particle {
  sx: number; sy: number;   // scatter origin
  x: number; y: number;    // current position
  orbitR: number;
  orbitAngle: number;
  orbitSpeed: number;
  r: number;
  type: ParticleType;
  alpha: number;
  delay: number;
}

const F = {
  MATERIALIZE_END: 70,
  ORBIT_END: 210,
  SPIRAL_END: 320,
  COLLAPSE_END: 360,
  REVEAL_END: 420,
  HOLD_END: 490,
  FADE_END: 520,
};

function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function IdentAnimation({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const RING_RADII = [cx * 0.72, cx * 0.48, cx * 0.26];

    function makeParticle(type: ParticleType, ring: number): Particle {
      const angle = Math.random() * Math.PI * 2;
      const scatter = 0.3 + Math.random() * 0.6;
      const sx = cx + Math.cos(angle) * (scatter * cx * 0.9);
      const sy = cy + Math.sin(angle) * (scatter * cy * 0.9);
      const baseSpeed = ring === 0 ? 0.012 : ring === 1 ? 0.018 : 0.026;
      const dir = Math.random() < 0.5 ? 1 : -1;
      return {
        sx, sy, x: sx, y: sy,
        orbitR: RING_RADII[ring],
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: (baseSpeed + Math.random() * 0.006) * dir,
        r: type === "gold" ? 1.4 + Math.random() * 1.0 : type === "pearl" ? 0.9 + Math.random() * 0.8 : 0.4 + Math.random() * 0.6,
        type,
        alpha: 0,
        delay: Math.random() * 45,
      };
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 18; i++) particles.push(makeParticle("gold", i < 8 ? 0 : 1));
    for (let i = 0; i < 32; i++) particles.push(makeParticle("pearl", i < 12 ? 1 : 2));
    for (let i = 0; i < 60; i++) particles.push(makeParticle("spark", Math.floor(Math.random() * 3)));

    let frame = 0;

    function drawGlow(x: number, y: number, r: number, alpha: number) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      grad.addColorStop(0, GOLD_GLOW + (alpha * 0.9).toFixed(2) + ")");
      grad.addColorStop(0.4, GOLD_GLOW + (alpha * 0.3).toFixed(2) + ")");
      grad.addColorStop(1, GOLD_GLOW + "0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      // Midnight blue radial background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
      bg.addColorStop(0, "#0d1229");
      bg.addColorStop(1, MIDNIGHT);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Ambient center glow grows during orbit
      if (frame > F.MATERIALIZE_END) {
        const t = Math.min(1, (frame - F.MATERIALIZE_END) / 120);
        const ambGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.4 * t);
        ambGlow.addColorStop(0, `rgba(240,180,41,${(0.08 * t).toFixed(2)})`);
        ambGlow.addColorStop(1, "rgba(240,180,41,0)");
        ctx.fillStyle = ambGlow;
        ctx.fillRect(0, 0, W, H);
      }

      for (const p of particles) {
        const lf = frame - p.delay;
        if (lf < 0) continue;

        if (lf < F.MATERIALIZE_END) {
          // Fade in from scattered positions
          p.alpha = Math.min(1, lf / 50) * 0.65;
          p.x = p.sx + (Math.random() - 0.5) * 0.25;
          p.y = p.sy + (Math.random() - 0.5) * 0.25;
          p.sx = p.x;
          p.sy = p.y;

        } else if (lf < F.ORBIT_END) {
          // Sweep into circular orbit
          const t = easeInOut(Math.min(1, (lf - F.MATERIALIZE_END) / (F.ORBIT_END - F.MATERIALIZE_END)));
          const targetX = cx + Math.cos(p.orbitAngle) * p.orbitR;
          const targetY = cy + Math.sin(p.orbitAngle) * p.orbitR;
          p.x = lerp(p.sx, targetX, t);
          p.y = lerp(p.sy, targetY, t);
          p.alpha = lerp(0.65, 0.9, t);
          if (t > 0.25) p.orbitAngle += p.orbitSpeed * t;

        } else if (lf < F.SPIRAL_END) {
          // Orbit tightens — spiral inward
          const t = (lf - F.ORBIT_END) / (F.SPIRAL_END - F.ORBIT_END);
          const shrink = 1 - t * 0.82;
          const speedUp = 1 + t * 3.5;
          p.orbitAngle += p.orbitSpeed * speedUp;
          const r = p.orbitR * shrink;
          p.x = cx + Math.cos(p.orbitAngle) * r;
          p.y = cy + Math.sin(p.orbitAngle) * r;
          p.alpha = 0.9 + t * 0.1;

        } else if (lf < F.COLLAPSE_END) {
          // Rush to center
          const t = easeInOut(Math.min(1, (lf - F.SPIRAL_END) / (F.COLLAPSE_END - F.SPIRAL_END)));
          const r = p.orbitR * 0.18 * (1 - t);
          p.orbitAngle += p.orbitSpeed * 5;
          p.x = lerp(cx + Math.cos(p.orbitAngle) * r, cx, t);
          p.y = lerp(cy + Math.sin(p.orbitAngle) * r, cy, t);
          p.alpha = 1 - t * 0.5;

        } else {
          // Shimmer around center after reveal
          const st = (lf - F.COLLAPSE_END) / 60;
          p.x = cx + Math.cos(p.orbitAngle + st * 0.3) * (2 + p.r * 4);
          p.y = cy + Math.sin(p.orbitAngle + st * 0.2) * (2 + p.r * 3);
          p.alpha = 0.25 + Math.sin(st * 2.5 + p.orbitAngle) * 0.18;
        }

        const a = Math.max(0, Math.min(1, p.alpha));
        if (a < 0.02) continue;

        if (p.type === "gold") drawGlow(p.x, p.y, p.r, a * 0.75);

        ctx.globalAlpha = a;
        ctx.fillStyle = p.type === "gold" ? GOLD : p.type === "pearl" ? PEARL : SPARK;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Golden flash at collapse
      if (frame >= F.SPIRAL_END && frame < F.REVEAL_END) {
        const flashT = Math.min(1, (frame - F.SPIRAL_END) / (F.COLLAPSE_END - F.SPIRAL_END));
        const peak = Math.sin(flashT * Math.PI) * 0.3;
        if (peak > 0) {
          const fl = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.55);
          fl.addColorStop(0, `rgba(240,200,80,${peak.toFixed(2)})`);
          fl.addColorStop(1, "rgba(240,200,80,0)");
          ctx.fillStyle = fl;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Wordmark
      if (frame > F.COLLAPSE_END) {
        const t = Math.min(1, (frame - F.COLLAPSE_END) / (F.REVEAL_END - F.COLLAPSE_END));
        const alpha = easeInOut(t);

        // Halo behind wordmark
        if (alpha > 0.01) {
          const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.65);
          halo.addColorStop(0, `rgba(240,180,41,${(alpha * 0.2).toFixed(2)})`);
          halo.addColorStop(1, "rgba(240,180,41,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);
        }

        // AVRRIO — luminous gold
        ctx.globalAlpha = alpha;
        ctx.fillStyle = GOLD;
        ctx.font = `bold ${Math.round(W * 0.075)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = `${W * 0.016}px`;
        ctx.fillText("AVRRIO", cx, cy - 4);

        // ENTERTAINMENT — pearl silver
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = PEARL;
        ctx.font = `${Math.round(W * 0.021)}px system-ui, -apple-system, sans-serif`;
        ctx.letterSpacing = `${W * 0.014}px`;
        ctx.fillText("ENTERTAINMENT", cx, cy + Math.round(W * 0.053));
        ctx.globalAlpha = 1;
        ctx.letterSpacing = "0px";
      }

      // Fade to midnight
      if (frame > F.HOLD_END) {
        const t = Math.min(1, (frame - F.HOLD_END) / (F.FADE_END - F.HOLD_END));
        ctx.globalAlpha = easeInOut(t);
        ctx.fillStyle = MIDNIGHT;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      frame++;
      if (frame < F.FADE_END + 10) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={270}
      className="w-full rounded-lg"
      style={{ aspectRatio: "16/9", background: MIDNIGHT }}
    />
  );
}
