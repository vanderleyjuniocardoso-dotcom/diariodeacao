import { useEffect, useState } from "react";
import brazilMap from "@/assets/brazil-map.png";


interface Props {
  avatarUrl?: string | null;
  fullName?: string;
  onDone: () => void;
}

/**
 * GGL intro: Brazil map with a magnifying glass searching around,
 * stops over São Paulo, "SEU GGL" appears inside the lens,
 * zooms in until it fills the screen, then fades.
 * Total duration ~5s. Tap to skip.
 */
const GglIntro = ({ onDone }: Props) => {
  // 0: searching, 1: focused on SP, 2: zoom, 3: fade
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 2600); // stop on SP
    const t2 = window.setTimeout(() => setPhase(2), 3400); // zoom
    const t3 = window.setTimeout(() => setPhase(3), 4500); // fade
    const t4 = window.setTimeout(() => onDone(), 5000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  // Approximate São Paulo position in the SVG viewBox(0 0 400 460)
  const SP = { x: 245, y: 320 };
  // Wandering positions for the magnifier before stopping on SP
  const search = [
    { x: 140, y: 120 },
    { x: 280, y: 180 },
    { x: 180, y: 260 },
    { x: 310, y: 270 },
    { x: 200, y: 360 },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (phase !== 0) return;
    const i = window.setInterval(() => setIdx((v) => (v + 1) % search.length), 500);
    return () => clearInterval(i);
  }, [phase]);

  const target = phase === 0 ? search[idx] : SP;

  return (
    <div
      onClick={onDone}
      className={`fixed inset-0 z-[70] cursor-pointer overflow-hidden transition-opacity duration-500 ${
        phase === 3 ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(to bottom, #e6f3ff 0%, #f5fbff 70%, #ffffff 100%)",
      }}
    >
      {/* Soft clouds (matching Trilha vibe) */}
      <div className="absolute top-[8%] left-[6%] w-40 h-14 bg-white/70 rounded-full blur-2xl" />
      <div className="absolute top-[18%] right-[10%] w-52 h-16 bg-white/60 rounded-full blur-2xl" />
      <div className="absolute top-[35%] left-[20%] w-32 h-10 bg-white/50 rounded-full blur-xl" />
      <div className="absolute bottom-[12%] right-[15%] w-44 h-14 bg-white/60 rounded-full blur-2xl" />
      <div className="absolute bottom-[24%] left-[8%] w-36 h-12 bg-white/55 rounded-full blur-2xl" />

      {/* Caption */}
      <div className="absolute top-12 inset-x-0 text-center px-6 z-10">
        <p className="text-primary font-bold text-lg drop-shadow-sm">
          {phase < 1 ? "Procurando seu GGL..." : "Encontramos seu GGL"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">toque para pular</p>
      </div>

      {/* Map + magnifier stage */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-[1100ms] ease-in-out"
        style={{
          transform: phase >= 2 ? "scale(6)" : "scale(1)",
          transformOrigin: `${(SP.x / 400) * 100}% ${(SP.y / 460) * 100}%`,
        }}
      >
        <div className="relative w-[78vw] max-w-[360px] aspect-[400/460]">
          {/* Brazil silhouette */}
          <svg
            viewBox="0 0 400 460"
            className="absolute inset-0 w-full h-full drop-shadow-md"
          >
            <defs>
              <linearGradient id="brGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Simplified Brazil shape */}
            <path
              d="M150,40 C200,30 260,45 290,80 C325,105 340,140 330,175 C355,195 360,230 340,255 C355,290 330,320 305,330 C295,365 270,395 235,405 C220,430 185,440 155,425 C120,430 95,405 95,375 C70,360 60,330 75,305 C50,285 50,250 75,230 C60,205 75,175 105,165 C95,135 110,100 140,85 C140,65 145,50 150,40 Z"
              fill="url(#brGrad)"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.5"
            />
            {/* Tiny dot for São Paulo */}
            <circle cx={SP.x} cy={SP.y} r="4" fill="#ef4444" />
            <circle cx={SP.x} cy={SP.y} r="9" fill="#ef4444" fillOpacity="0.25">
              <animate attributeName="r" values="6;14;6" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>

          {/* Magnifier */}
          <div
            className="absolute transition-all duration-[480ms] ease-in-out"
            style={{
              left: `${(target.x / 400) * 100}%`,
              top: `${(target.y / 460) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative">
              {/* lens */}
              <div
                className={`w-24 h-24 rounded-full border-[6px] border-slate-700 bg-white/30 backdrop-blur-[2px] flex items-center justify-center shadow-xl transition-all duration-500 ${
                  phase >= 1 ? "border-primary bg-primary/10" : ""
                }`}
              >
                {phase >= 1 && (
                  <span className="font-extrabold text-primary text-sm tracking-wider animate-fade-in text-center leading-tight">
                    SEU
                    <br />
                    GGL
                  </span>
                )}
              </div>
              {/* handle */}
              <div
                className="absolute w-3 h-12 bg-slate-700 rounded-full origin-top"
                style={{
                  right: "-6px",
                  bottom: "-40px",
                  transform: "rotate(-45deg) translate(8px, -4px)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GglIntro;
