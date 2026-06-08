import { useEffect, useState } from "react";

// Random lightning bolts + ambient flashes — pure CSS/SVG, no deps.
type Bolt = { id: number; left: number; rot: number; scale: number; delay: number };

function makeBolt(id: number): Bolt {
  return {
    id,
    left: Math.random() * 100,
    rot: (Math.random() - 0.5) * 30,
    scale: 0.6 + Math.random() * 0.9,
    delay: Math.random() * 0.4,
  };
}

export function Lightning() {
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let alive = true;
    let nextId = 0;
    const strike = () => {
      if (!alive) return;
      const count = 1 + Math.floor(Math.random() * 3);
      const newBolts = Array.from({ length: count }, () => makeBolt(nextId++));
      setBolts((b) => [...b, ...newBolts]);
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
      setTimeout(() => {
        setBolts((b) => b.filter((x) => !newBolts.find((nb) => nb.id === x.id)));
      }, 1400);
      setTimeout(strike, 2500 + Math.random() * 5000);
    };
    const t = setTimeout(strike, 1200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {/* Ambient flash */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.95 0.1 230 / 0.35), transparent 60%)",
          opacity: flash ? 1 : 0,
        }}
      />
      {bolts.map((b) => (
        <svg
          key={b.id}
          className="absolute top-0 animate-bolt"
          style={{
            left: `${b.left}%`,
            transform: `translateX(-50%) rotate(${b.rot}deg) scale(${b.scale})`,
            transformOrigin: "top center",
            filter:
              "drop-shadow(0 0 8px oklch(0.9 0.2 230)) drop-shadow(0 0 22px oklch(0.85 0.22 310 / 0.9))",
            animationDelay: `${b.delay}s`,
          }}
          width="80"
          height="420"
          viewBox="0 0 80 420"
          fill="none"
        >
          <path
            d="M42 0 L20 160 L46 168 L18 320 L52 200 L30 192 L60 40 Z"
            fill="oklch(0.98 0.08 230)"
            stroke="oklch(0.85 0.22 310)"
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}
