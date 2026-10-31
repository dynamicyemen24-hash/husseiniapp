import React, { useEffect, useRef } from "react";

/**
 * ModernBackground — a lightweight, dependency-free animated canvas
 * that renders a subtle network of floating geometric particles with
 * slow-pulsing brand-accent connections.
 *
 * Design goals:
 *  - Zero layout shift (absolute, pointer-events-none)
 *  - GPU-accelerated (transform + opacity only)
 *  - Respects prefers-reduced-motion
 *  - Adapts to light/dark via CSS variables
 *  - ~1 KB gzipped
 */
export function ModernBackground({
  className = "",
  density = 48,
  accentColor = "var(--brand)",
}: {
  className?: string;
  density?: number;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    };

    const particles: Particle[] = [];
    for (let i = 0; i < density; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.6 + 0.4,
      });
    }

    let frame = 0;
    // PERFORMANCE BUDGET: the render loop only runs while this canvas is on
    // screen. Off-screen hero sections used to burn a 60fps loop forever —
    // invisible work that drained mobile battery for zero visual value.
    let raf = 0;
    let isVisible = true;

    const draw = () => {
      raf = 0;
      if (!isVisible) return; // paused by IntersectionObserver

      if (width !== canvas.offsetWidth || height !== canvas.offsetHeight) {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Pulsing opacity for a breathing effect
      const pulse = 0.18 + 0.07 * Math.sin(frame * 0.02);

      // Draw connections
      ctx.strokeStyle = `color-mix(in srgb, ${accentColor} ${pulse * 100}, transparent)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < density; i++) {
        for (let j = i + 1; j < density; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.12;
            ctx.strokeStyle = `color-mix(in srgb, ${accentColor} ${alpha * 100}, transparent)`;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      ctx.fillStyle = accentColor;
      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };

    // Pause when scrolled away / hidden, resume on re-entry.
    const io = new IntersectionObserver(
      entries => {
        const visible = entries[0]?.isIntersecting ?? true;
        if (visible === isVisible) return;
        isVisible = visible;
        if (isVisible && !raf && !prefersReduced) {
          raf = requestAnimationFrame(draw);
        } else if (!isVisible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    // Respect reduced motion: draw one static frame, never animate.
    if (!prefersReduced) {
      raf = requestAnimationFrame(draw);
    } else {
      isVisible = false;
      // One static frame so the section isn't blank.
      frame = 1;
      draw();
      isVisible = true; // allow IO to control future scheduling
    }

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [density, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * HeroBackground — wraps ModernBackground with a gradient overlay
 * for hero sections. Provides a modern, layered depth effect.
 */
export function HeroBackground({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <ModernBackground density={56} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,121,69,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(15,42,43,0.08),transparent_50%)]" />
      {children}
    </div>
  );
}

/**
 * TechGridBackground — lightweight SVG pattern overlay for technical elegance
 */
export function TechGridBackground({
  className = "",
  opacity = 0.3,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none tech-grid ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}

/**
 * GlowBlobBackground — ambient glowing radial gradients for atmospheric depth
 */
export function GlowBlobBackground({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -top-40 right-1/4 w-96 h-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-amber-500/8 blur-3xl" />
      <div className="absolute -bottom-20 right-1/3 w-96 h-96 rounded-full bg-sky-500/8 blur-3xl" />
    </div>
  );
}
