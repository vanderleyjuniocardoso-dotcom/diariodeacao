import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface IntroVolunteer {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Props {
  volunteers: IntroVolunteer[];
  onDone: () => void;
}

const fireConfetti = () => {
  const colors = ["#22d3ee", "#f43f5e", "#facc15", "#34d399", "#a78bfa", "#fb923c"];
  confetti({
    particleCount: 200,
    spread: 120,
    startVelocity: 60,
    origin: { y: 0.5 },
    colors,
  });
  setTimeout(() => {
    confetti({ particleCount: 100, angle: 60, spread: 80, origin: { x: 0, y: 0.6 }, colors });
    confetti({ particleCount: 100, angle: 120, spread: 80, origin: { x: 1, y: 0.6 }, colors });
  }, 250);
};

const VolunteersIntro = ({ volunteers, onDone }: Props) => {
  // Pega até 8 voluntários para a animação
  const items = volunteers.slice(0, 8);
  const [revealed, setRevealed] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [closing, setClosing] = useState(false);

  // tamanho do palco
  const stageSize = 320;
  const radius = 130;
  const center = stageSize / 2;

  // posições em círculo
  const positions = items.map((_, i) => {
    const angle = (i / Math.max(items.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  useEffect(() => {
    const timers: number[] = [];
    const stepDelay = 280;

    items.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setRevealed(i + 1), 600 + i * stepDelay),
      );
    });

    const totalReveal = 600 + items.length * stepDelay + 400;

    timers.push(
      window.setTimeout(() => setZooming(true), totalReveal),
    );
    timers.push(
      window.setTimeout(() => {
        fireConfetti();
        setClosing(true);
      }, totalReveal + 1100),
    );
    timers.push(
      window.setTimeout(() => onDone(), totalReveal + 2000),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-hidden ${
        closing ? "animate-fade-out" : "animate-fade-in"
      }`}
      onClick={onDone}
      role="dialog"
      aria-label="Apresentação dos voluntários"
    >
      <div
        className="relative transition-transform duration-1000 ease-in"
        style={{
          width: stageSize,
          height: stageSize,
          transform: zooming ? "scale(6)" : "scale(1)",
          opacity: zooming ? 0 : 1,
          transitionProperty: "transform, opacity",
        }}
      >
        {/* Linhas SVG ligando o planeta aos avatares */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={stageSize}
          height={stageSize}
          viewBox={`0 0 ${stageSize} ${stageSize}`}
        >
          {positions.map((p, i) => {
            const visible = revealed > i;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="200"
                strokeDashoffset={visible ? 0 : 200}
                style={{
                  transition: "stroke-dashoffset 0.5s ease-out",
                  opacity: 0.7,
                }}
              />
            );
          })}
        </svg>

        {/* Planeta Terra */}
        <div
          className="absolute rounded-full flex items-center justify-center text-7xl shadow-[0_0_60px_hsl(var(--primary)/0.5)]"
          style={{
            left: center - 50,
            top: center - 50,
            width: 100,
            height: 100,
            background:
              "radial-gradient(circle at 30% 30%, #4ade80, #2563eb 60%, #1e3a8a)",
            animation: "spin 8s linear infinite",
          }}
        >
          <span
            className="select-none"
            style={{
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              animation: "spin 8s linear infinite reverse",
            }}
          >
            🌍
          </span>
        </div>

        {/* Avatares */}
        {items.map((v, i) => {
          const p = positions[i];
          const visible = revealed > i;
          const initials = v.full_name
            ?.split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div
              key={v.id}
              className="absolute rounded-full border-2 border-primary bg-card overflow-hidden shadow-lg flex items-center justify-center text-xs font-semibold text-primary"
              style={{
                left: p.x - 24,
                top: p.y - 24,
                width: 48,
                height: 48,
                opacity: visible ? 1 : 0,
                transform: visible
                  ? "scale(1) translate(0,0)"
                  : `scale(0.2) translate(${center - p.x}px, ${center - p.y}px)`,
                transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out",
              }}
            >
              {v.avatar_url ? (
                <img src={v.avatar_url} alt={v.full_name} className="w-full h-full object-cover" />
              ) : (
                <span>{initials || "?"}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VolunteersIntro;
