"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  phase: "scatter" | "travel" | "assemble" | "hold";
  delay: number;
  brief: string | null;
  briefAlpha: number;
}

const BRIEF_FORMS = ["◻", "◎", "▣", "⬡", "◈"];

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

    const COUNT = 120;
    const particles: Particle[] = [];

    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * (Math.min(W, H) * 0.45);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        tx: cx + (Math.random() - 0.5) * 8,
        ty: cy + (Math.random() - 0.5) * 8,
        vx: 0,
        vy: 0,
        r: 0.6 + Math.random() * 1.4,
        alpha: 0,
        phase: "scatter",
        delay: Math.random() * 80,
        brief: Math.random() < 0.12 ? BRIEF_FORMS[Math.floor(Math.random() * BRIEF_FORMS.length)] : null,
        briefAlpha: 0,
      });
    }

    let frame = 0;
    const PHASE_SCATTER_END = 60;
    const PHASE_TRAVEL_END = 180;
    const PHASE_ASSEMBLE_END = 280;
    const PHASE_HOLD_END = 370;
    const TOTAL = PHASE_HOLD_END + 30;

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, W, H);

      for (const p of particles) {
        const localFrame = frame - p.delay;

        if (localFrame < 0) continue;

        if (localFrame < PHASE_SCATTER_END) {
          // Fade in, drift slightly
          p.alpha = Math.min(1, localFrame / 30) * 0.5;
          p.x += (Math.random() - 0.5) * 0.3;
          p.y += (Math.random() - 0.5) * 0.3;
          // Brief form flicker
          if (p.brief && localFrame > 20 && localFrame < 50) {
            p.briefAlpha = Math.sin(((localFrame - 20) / 30) * Math.PI);
          }
        } else if (localFrame < PHASE_TRAVEL_END) {
          // Accelerate toward center
          const t = (localFrame - PHASE_SCATTER_END) / (PHASE_TRAVEL_END - PHASE_SCATTER_END);
          const eased = t * t;
          p.alpha = 0.5 + eased * 0.5;
          p.x += (p.tx - p.x) * 0.04 * (1 + eased * 2);
          p.y += (p.ty - p.y) * 0.04 * (1 + eased * 2);
          p.briefAlpha = Math.max(0, p.briefAlpha - 0.05);
        } else if (localFrame < PHASE_ASSEMBLE_END) {
          // Tight assembly
          p.alpha = 1;
          p.x += (p.tx - p.x) * 0.18;
          p.y += (p.ty - p.y) * 0.18;
          p.briefAlpha = 0;
        } else {
          p.alpha = 1;
          p.briefAlpha = 0;
        }

        // Draw brief form symbol
        if (p.brief && p.briefAlpha > 0.01) {
          ctx.globalAlpha = p.briefAlpha * 0.6;
          ctx.fillStyle = "#a1a1aa";
          ctx.font = `${p.r * 6}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.brief, p.x, p.y);
        }

        // Draw particle dot
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = "#e4e4e7";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Logo text appears after assembly
      if (frame > PHASE_ASSEMBLE_END) {
        const t = Math.min(1, (frame - PHASE_ASSEMBLE_END) / 40);
        const alpha = t * t;

        // AVRRIO wordmark
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#f4f4f5";
        ctx.font = `bold ${Math.round(W * 0.072)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = `${W * 0.014}px`;
        ctx.fillText("AVRRIO", cx, cy - 4);

        // ENTERTAINMENT
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = "#a1a1aa";
        ctx.font = `${Math.round(W * 0.022)}px system-ui, sans-serif`;
        ctx.letterSpacing = `${W * 0.012}px`;
        ctx.fillText("ENTERTAINMENT", cx, cy + Math.round(W * 0.054));
        ctx.globalAlpha = 1;
      }

      // Fade-out overlay
      if (frame > PHASE_HOLD_END) {
        const t = Math.min(1, (frame - PHASE_HOLD_END) / 30);
        ctx.globalAlpha = t;
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      frame++;
      if (frame < TOTAL + 10) {
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
      className="w-full rounded-lg bg-zinc-950"
      style={{ aspectRatio: "16/9" }}
    />
  );
}
