import { useEffect, useState } from "react";
import { Heart, Monitor } from "lucide-react";
import grupoVoluntarios from "@/assets/grupo-voluntarios.png";

interface Props {
  onDone: () => void;
}

// Hearts launched from the group photo, each with an offset origin
const HEARTS = [
  { ox: -100, delay: 0 },
  { ox: -60, delay: 350 },
  { ox: -25, delay: 700 },
  { ox: 15, delay: 1050 },
  { ox: 55, delay: 1400 },
  { ox: 90, delay: 1750 },
  { ox: -80, delay: 2100 },
  { ox: -20, delay: 2450 },
  { ox: 40, delay: 2800 },
  { ox: 75, delay: 3150 },
  { ox: -50, delay: 3500 },
  { ox: 30, delay: 3850 },
  { ox: -10, delay: 4200 },
  { ox: 60, delay: 4550 },
  { ox: -40, delay: 4900 },
  { ox: 20, delay: 5250 },
];

const RegisterIntro = ({ onDone }: Props) => {
  const [hearts, setHearts] = useState<number[]>([]);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    HEARTS.forEach((h, i) => {
      timers.push(window.setTimeout(() => setHearts((arr) => [...arr, i]), 500 + h.delay));
    });
    timers.push(window.setTimeout(() => setZoom(true), 7000));
    timers.push(window.setTimeout(() => onDone(), 8000));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-sky-50 to-white overflow-hidden cursor-pointer"
    >
      <style>{`
        @keyframes ri-pop { 0% { transform: translate(-50%, 20px) scale(0.95); opacity: 0; } 100% { transform: translate(-50%, 0) scale(1); opacity: 1; } }
        @keyframes ri-fly { 0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--tx)), var(--ty)) scale(0.4); opacity: 0; } }
        @keyframes ri-pulse { 0%,100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.06); } }
        @keyframes ri-zoom { 0% { transform: translateX(-50%) scale(1); opacity: 1; } 100% { transform: translateX(-50%) scale(8); opacity: 0; } }
      `}</style>

      {/* Computer */}
      <div
        className="absolute"
        style={{
          top: "8%",
          left: "50%",
          animation: zoom ? "ri-zoom 0.9s ease-in forwards" : "ri-pulse 1.6s ease-in-out infinite",
          transformOrigin: "center",
        }}
      >
        <div className="relative">
          <div className="w-44 h-28 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 border-4 border-slate-700 shadow-2xl flex items-center justify-center">
            <Monitor className="w-12 h-12 text-white/80" strokeWidth={1.5} />
            <Heart className="absolute w-10 h-10 text-white fill-white animate-pulse" />
          </div>
          <div className="mx-auto w-20 h-3 bg-slate-700 rounded-b-md" />
          <div className="mx-auto w-28 h-1.5 bg-slate-800 rounded-full mt-0.5" />
        </div>
      </div>

      {/* Group photo - large and centered */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: "translate(-50%, 0)",
          animation: "ri-pop 0.8s ease-out both",
        }}
      >
        <div className="relative">
          <img
            src={grupoVoluntarios}
            alt="Grupo de voluntários"
            className="w-[88vw] max-w-[480px] h-auto drop-shadow-2xl select-none pointer-events-none"
          />

          {/* Hearts flying from the photo to the computer */}
          {HEARTS.map((h, i) =>
            hearts.includes(i) ? (
              <Heart
                key={i}
                className="absolute w-9 h-9 text-blue-500 fill-blue-500 drop-shadow-lg pointer-events-none"
                style={
                  {
                    left: "50%",
                    top: "30%",
                    "--tx": `${h.ox}px`,
                    "--ty": `-340px`,
                    animation: "ri-fly 1.6s ease-in forwards",
                  } as React.CSSProperties
                }
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterIntro;
