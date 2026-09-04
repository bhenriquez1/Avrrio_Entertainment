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
  ORBIT_FORM_END: 385,
  REVEAL_END: 430,
  SPARK_FRAME: 438,
  HOLD_END: 525,
  FADE_END: 555,
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
    const context = ctx;

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
    const orbitCx = cx + W * 0.015;
    const orbitCy = cy - H * 0.015;
    const orbitRx = W * 0.37;
    const orbitRy = H * 0.235;
    const orbitTilt = -0.11;

    function orbitPoint(angle: number) {
      const x = Math.cos(angle) * orbitRx;
      const y = Math.sin(angle) * orbitRy;
      return { x: orbitCx + x * Math.cos(orbitTilt) - y * Math.sin(orbitTilt), y: orbitCy + x * Math.sin(orbitTilt) + y * Math.cos(orbitTilt) };
    }

    function drawOrbit(start: number, end: number, alpha: number, width: number) {
      context.save(); context.translate(orbitCx, orbitCy); context.rotate(orbitTilt); context.beginPath();
      context.ellipse(0, 0, orbitRx, orbitRy, 0, start, end); context.strokeStyle=`rgba(240,180,41,${alpha})`; context.lineWidth=width; context.lineCap="round"; context.shadowColor=GOLD; context.shadowBlur=10; context.stroke(); context.restore();
    }

    function drawGlow(x: number, y: number, r: number, alpha: number) {
      const grad = context.createRadialGradient(x, y, 0, x, y, r * 5);
      grad.addColorStop(0, GOLD_GLOW + (alpha * 0.9).toFixed(2) + ")");
      grad.addColorStop(0.4, GOLD_GLOW + (alpha * 0.3).toFixed(2) + ")");
      grad.addColorStop(1, GOLD_GLOW + "0)");
      context.fillStyle = grad;
      context.beginPath();
      context.arc(x, y, r * 5, 0, Math.PI * 2);
      context.fill();
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

        } else if (lf < F.ORBIT_FORM_END) {
          // Gravity catches every particle and bends it into Avrrio's elliptical orbit.
          const t = easeInOut(Math.min(1, (lf - F.SPIRAL_END) / (F.ORBIT_FORM_END - F.SPIRAL_END)));
          const target = orbitPoint(p.orbitAngle + t * 2.2);
          p.x = lerp(p.x, target.x, 0.06 + t * 0.2); p.y = lerp(p.y, target.y, 0.06 + t * 0.2);
          p.alpha = 1 - t * 0.72;
        } else {
          p.alpha *= 0.86;
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

      // Back half of the orbit: visibly travels behind the letters.
      if (frame > F.SPIRAL_END) {
        const formation=Math.min(1,(frame-F.SPIRAL_END)/(F.ORBIT_FORM_END-F.SPIRAL_END));
        drawOrbit(Math.PI,Math.PI*1.92,formation*0.58,1.7);
      }

      // Pearl/silver wordmark, illuminated by the approaching gold point.
      if (frame > F.ORBIT_FORM_END-18) {
        const t = Math.min(1, (frame - (F.ORBIT_FORM_END-18)) / (F.REVEAL_END - F.ORBIT_FORM_END+18));
        const alpha = easeInOut(t);

        // Halo behind wordmark
        if (alpha > 0.01) {
          const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.65);
          halo.addColorStop(0, `rgba(200,215,235,${(alpha * 0.14).toFixed(2)})`);
          halo.addColorStop(1, "rgba(200,215,235,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, W, H);
        }

        // AVRRIO — premium luminous pearl/silver
        ctx.globalAlpha = alpha;
        const silver=ctx.createLinearGradient(0,cy-35,0,cy+22); silver.addColorStop(0,"#ffffff"); silver.addColorStop(.46,"#dfe5ec"); silver.addColorStop(1,"#9ba7b8");
        ctx.fillStyle = silver; ctx.shadowColor="rgba(220,235,255,.55)"; ctx.shadowBlur=8*alpha;
        ctx.font = `bold ${Math.round(W * 0.075)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = `${W * 0.016}px`;
        ctx.fillText("AVRRIO", cx, cy - 4);

        // ENTERTAINMENT — pearl silver
        ctx.shadowBlur=0; ctx.globalAlpha = alpha * 0.72;
        ctx.fillStyle = PEARL;
        ctx.font = `${Math.round(W * 0.021)}px system-ui, -apple-system, sans-serif`;
        ctx.letterSpacing = `${W * 0.014}px`;
        ctx.fillText("ENTERTAINMENT", cx, cy + Math.round(W * 0.053));
        ctx.globalAlpha = 1;
        ctx.letterSpacing = "0px";
      }

      // Foreground sweep remains intentionally open, creating depth and a proprietary silhouette.
      if(frame>F.ORBIT_FORM_END){const t=Math.min(1,(frame-F.ORBIT_FORM_END)/(F.SPARK_FRAME-F.ORBIT_FORM_END));const end=-0.22+Math.PI*1.02*t;drawOrbit(-0.22,end,0.9,2.25);const head=orbitPoint(end);drawGlow(head.x,head.y,3.1,Math.min(1,t));ctx.fillStyle="#ffe59a";ctx.beginPath();ctx.arc(head.x,head.y,1.8,0,Math.PI*2);ctx.fill()}

      // A single suspended Avrrio Spark pulses once; no explosion.
      if(frame>=F.SPARK_FRAME){const age=frame-F.SPARK_FRAME;const a=Math.max(0,Math.min(1,age/8))*Math.max(0,1-age/92);const pulse=1+Math.exp(-Math.pow((age-18)/7,2))*.65;const s=orbitPoint(Math.PI*.80);ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=a;ctx.strokeStyle="#ffe6a0";ctx.shadowColor=GOLD;ctx.shadowBlur=14;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-7*pulse,0);ctx.lineTo(7*pulse,0);ctx.moveTo(0,-7*pulse);ctx.lineTo(0,7*pulse);ctx.stroke();ctx.fillStyle="#fff4c7";ctx.beginPath();ctx.arc(0,0,2.2*pulse,0,Math.PI*2);ctx.fill();ctx.restore()}

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
