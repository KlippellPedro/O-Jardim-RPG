import { useEffect, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
  twinkleSpeed: number;
  color: readonly [number, number, number];
};

const STAR_COLORS = [
  [255, 255, 255],
  [214, 228, 255],
  [255, 239, 202],
  [225, 210, 255],
] as const;

function createRandom(seed = 0x6d2b79f5) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function resetStar(star: Star, random: () => number, initial = false) {
  star.z = initial ? 0.08 + random() * 0.92 : 1;

  // As coordenadas nascem proporcionais à profundidade. Ao se aproximarem da
  // câmera, elas se afastam naturalmente do centro em vez de deslizar em grade.
  star.x = (random() * 2 - 1) * star.z * 0.82;
  star.y = (random() * 2 - 1) * star.z * 0.82;
  star.size = 0.35 + Math.pow(random(), 2.6) * 1.75;
  star.phase = random() * Math.PI * 2;
  star.twinkleSpeed = 0.7 + random() * 1.8;
  star.color = STAR_COLORS[Math.floor(random() * STAR_COLORS.length)];
}

function createStars(count: number) {
  const random = createRandom();
  return Array.from({ length: count }, () => {
    const star: Star = {
      x: 0,
      y: 0,
      z: 1,
      size: 1,
      phase: 0,
      twinkleSpeed: 1,
      color: STAR_COLORS[0],
    };
    resetStar(star, random, true);
    return star;
  });
}

export default function AtmosphericBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const random = createRandom(0x91e10da5);
    let stars: Star[] = [];
    let width = 1;
    let height = 1;
    let animationFrame = 0;
    let lastFrame = performance.now();
    let lastDraw = 0;

    const hasReducedEffects = () => (
      motionQuery.matches
      || document.documentElement.dataset.performanceMode === 'reduced'
    );

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const area = width * height;
      const count = hasReducedEffects()
        ? Math.round(Math.min(230, Math.max(120, area / 9000)))
        : Math.round(Math.min(520, Math.max(220, area / 4300)));
      stars = createStars(count);
    };

    const draw = (elapsed: number, deltaSeconds = 0) => {
      context.clearRect(0, 0, width, height);

      const centerX = width * (0.5 + Math.sin(elapsed * 0.00007) * 0.018);
      const centerY = height * (0.5 + Math.cos(elapsed * 0.000055) * 0.014);
      const travel = deltaSeconds * 0.055;

      for (const star of stars) {
        const previousZ = star.z;
        if (travel > 0) star.z -= travel;

        const projectedX = centerX + (star.x / star.z) * width * 0.66;
        const projectedY = centerY + (star.y / star.z) * height * 0.66;

        if (
          star.z <= 0.035
          || projectedX < -30
          || projectedX > width + 30
          || projectedY < -30
          || projectedY > height + 30
        ) {
          resetStar(star, random);
          continue;
        }

        const depth = 1 - star.z;
        const twinkle = 0.78 + Math.sin(elapsed * 0.001 * star.twinkleSpeed + star.phase) * 0.22;
        const opacity = Math.min(0.92, (0.2 + depth * 0.72) * twinkle);
        const radius = Math.min(2.35, star.size * (0.45 + depth * 1.25));
        const [red, green, blue] = star.color;

        if (radius > 1.35) {
          context.beginPath();
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity * 0.12})`;
          context.arc(projectedX, projectedY, radius * 3.1, 0, Math.PI * 2);
          context.fill();
        }

        if (travel > 0 && star.z < 0.28) {
          const previousX = centerX + (star.x / previousZ) * width * 0.66;
          const previousY = centerY + (star.y / previousZ) * height * 0.66;
          context.beginPath();
          context.moveTo(previousX, previousY);
          context.lineTo(projectedX, projectedY);
          context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${opacity * 0.42})`;
          context.lineWidth = Math.max(0.45, radius * 0.55);
          context.stroke();
        }

        context.beginPath();
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
        context.arc(projectedX, projectedY, Math.max(0.42, radius), 0, Math.PI * 2);
        context.fill();

        if (radius > 1.8) {
          context.beginPath();
          context.moveTo(projectedX - radius * 2.4, projectedY);
          context.lineTo(projectedX + radius * 2.4, projectedY);
          context.moveTo(projectedX, projectedY - radius * 2.4);
          context.lineTo(projectedX, projectedY + radius * 2.4);
          context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${opacity * 0.35})`;
          context.lineWidth = 0.55;
          context.stroke();
        }
      }
    };

    const animate = (now: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      if (document.hidden || hasReducedEffects() || now - lastDraw < 1000 / 30) {
        lastFrame = now;
        return;
      }

      const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      lastDraw = now;
      draw(now, deltaSeconds);
    };

    const refreshMotion = () => {
      resize();
      draw(performance.now());
    };

    resize();
    draw(lastFrame);
    animationFrame = window.requestAnimationFrame(animate);
    window.addEventListener('resize', resize, { passive: true });
    motionQuery.addEventListener('change', refreshMotion);

    const performanceObserver = new MutationObserver(refreshMotion);
    performanceObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-performance-mode'],
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      motionQuery.removeEventListener('change', refreshMotion);
      performanceObserver.disconnect();
    };
  }, []);

  return (
    <div className="atmospheric-background fixed inset-0 z-0 overflow-hidden bg-background pointer-events-none" aria-hidden="true">
      <div className="atmospheric-glows performance-decorative" />
      <canvas ref={canvasRef} className="atmospheric-starfield" />
    </div>
  );
}
