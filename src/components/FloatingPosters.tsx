import { useMemo } from "react";
import p1 from "@/assets/poster-1.png";
import p2 from "@/assets/poster-2.png";
import p3 from "@/assets/poster-3.png";
import p4 from "@/assets/poster-4.png";
import p5 from "@/assets/poster-5.png";
import p6 from "@/assets/poster-6.png";

const POSTERS = [p1, p2, p3, p4, p5, p6];

type Bubble = {
  src: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
};

export function FloatingPosters({ count = 14 }: { count?: number }) {
  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: count }).map((_, i) => ({
      src: POSTERS[i % POSTERS.length],
      left: Math.random() * 100,
      size: 32 + Math.random() * 48,
      duration: 14 + Math.random() * 18,
      delay: -Math.random() * 30,
      drift: (Math.random() - 0.5) * 60,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {bubbles.map((b, i) => (
        <img
          key={i}
          src={b.src}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute rounded-full object-cover opacity-70 animate-poster-drop"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            top: -80,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            ["--drift" as never]: `${b.drift}px`,
            boxShadow:
              "0 0 14px oklch(0.7 0.22 320 / 0.55), 0 0 28px oklch(0.7 0.22 230 / 0.35)",
            border: "1px solid oklch(0.85 0.15 320 / 0.5)",
          }}
        />
      ))}
    </div>
  );
}
