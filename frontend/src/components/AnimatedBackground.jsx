import React, { useEffect, useRef } from 'react';

/**
 * Animated flowing wave lines + floating orbs à la LangChain.
 * Pure Canvas + CSS — no extra deps.
 */
const AnimatedBackground = ({ variant = 'hero' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrame;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // Wave lines config
    const lines = Array.from({ length: 6 }, (_, i) => ({
      offset: i * 0.15,
      amplitude: 30 + i * 12,
      speed: 0.0004 + i * 0.0001,
      color: i % 2 === 0 ? 'rgba(124, 58, 237, 0.12)' : 'rgba(6, 182, 212, 0.10)',
      width: 1.5 - i * 0.1,
    }));

    // Nodes / glowing dots
    const nodes = Array.from({ length: 8 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: 2 + Math.random() * 2,
      pulse: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);
      t += 1;

      // Draw wave lines from bottom center
      const cx = w / 2;
      const cy = h;

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;

        for (let x = 0; x <= w; x += 2) {
          const dx = (x - cx) / w;
          const phase = t * line.speed + line.offset + dx * 3;
          const y = cy - Math.abs(dx) * h * 0.8 - Math.sin(phase) * line.amplitude * (1 - Math.abs(dx));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Glowing nodes
      nodes.forEach((node) => {
        node.x += node.vx * 0.001;
        node.y += node.vy * 0.001;
        node.pulse += 0.02;

        if (node.x < 0 || node.x > 1) node.vx *= -1;
        if (node.y < 0 || node.y > 1) node.vy *= -1;

        const nx = node.x * w;
        const ny = node.y * h;
        const glowR = node.r + Math.sin(node.pulse) * 1.5;

        // Glow
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR * 6);
        grad.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
        grad.addColorStop(1, 'rgba(167, 139, 250, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR * 6, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = 'rgba(167, 139, 250, 0.7)';
        ctx.beginPath();
        ctx.arc(nx, ny, glowR, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Floating gradient orbs */}
      <div
        className="floating-orb floating-orb-purple animate-float"
        style={{ width: '400px', height: '400px', top: '-10%', left: '-5%', animationDelay: '0s' }}
      />
      <div
        className="floating-orb floating-orb-cyan animate-float"
        style={{ width: '300px', height: '300px', bottom: '-10%', right: '-5%', animationDelay: '3s' }}
      />
      <div
        className="floating-orb floating-orb-purple animate-float"
        style={{ width: '200px', height: '200px', top: '40%', right: '20%', animationDelay: '6s', opacity: 0.15 }}
      />

      {/* Canvas for wave lines + nodes */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.6 }}
      />
    </div>
  );
};

export default AnimatedBackground;
