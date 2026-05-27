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

  // Approximate São Paulo position as % of the map image
  const SP = { x: 62, y: 70 };
  // Wandering positions for the magnifier (in %) before stopping on SP
  const search = [
    { x: 30, y: 25 },
    { x: 65, y: 35 },
    { x: 40, y: 55 },
    { x: 75, y: 55 },
    { x: 45, y: 78 },
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
          {phase < 1 ? "Procurando seu GGL..." : "Encontramos!"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">toque para pular</p>
      </div>

      {/* Map + magnifier stage */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-[1100ms] ease-in-out"
        style={{
          transform: phase >= 2 ? "scale(6)" : "scale(1)",
          transformOrigin: `${SP.x}% ${SP.y}%`,
        }}
      >
        <div className="relative w-[80vw] max-w-[380px] aspect-square">
          {/* Brazil map image */}
          <img
            src={brazilMap}
            alt="Mapa do Brasil"
            className="absolute inset-0 w-full h-full object-contain drop-shadow-md select-none pointer-events-none"
            draggable={false}
          />

          {/* Pulsing São Paulo marker */}
          <div
            className="absolute"
            style={{ left: `${SP.x}%`, top: `${SP.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <div className="relative w-3 h-3">
              <div className="absolute inset-0 rounded-full bg-red-500" />
              <div className="absolute -inset-2 rounded-full bg-red-500/30 animate-ping" />
            </div>
          </div>

          {/* Magnifier */}
          <div
            className="absolute transition-all duration-[480ms] ease-in-out"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative">
              {/* lens */}
              <div
                className={`w-24 h-24 rounded-full border-[6px] border-slate-700 bg-white/30 backdrop-blur-[2px] flex items-center justify-center shadow-xl transition-all duration-500 ${
                  phase >= 1 ? "border-primary bg-primary/20" : ""
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

