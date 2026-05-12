import { useEffect, useState } from "react";
import { Heart, Monitor, User } from "lucide-react";

interface Props {
  onDone: () => void;
}

const VOLUNTEERS = [
  { x: 10, delay: 0 },
  { x: 22, delay: 120 },
  { x: 34, delay: 240 },
  { x: 16, delay: 360, back: true },
  { x: 28, delay: 480, back: true },
];

const RegisterIntro = ({ onDone }: Props) => {
  const [hearts, setHearts] = useState<number[]>([]);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    // Launch hearts staggered after volunteers appear
    const timers: number[] = [];
    VOLUNTEERS.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          setHearts((h) => [...h, i]);
        }, 900 + i * 280)
      );
    });
    timers.push(window.setTimeout(() => setZoom(true), 2600));
    timers.push(window.setTimeout(() => onDone(), 3400));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-sky-50 to-white overflow-hidden">
      <style>{`
        @keyframes ri-pop { 0% { transform: translateY(40px) scale(0.5); opacity: 0; } 60% { transform: translateY(-6px) scale(1.05); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes ri-fly { 0% { transform: translate(0,0) scale(0.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0.4); opacity: 0; } }
        @keyframes ri-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes ri-zoom { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(8); opacity: 0; } }
      `}</style>

      {/* Computer */}
      <div
        className="absolute"
        style={{
          top: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          animation: zoom ? "ri-zoom 0.8s ease-in forwards" : "ri-pulse 1.6s ease-in-out infinite",
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

      {/* Volunteers row */}
      <div className="absolute bottom-[18%] left-0 right-0 flex justify-center gap-3 px-4">
        {VOLUNTEERS.map((v, i) => (
          <div
            key={i}
            className="relative"
            style={{
              animation: `ri-pop 0.6s ease-out ${v.delay}ms both`,
              zIndex: v.back ? 1 : 2,
              marginTop: v.back ? -18 : 0,
            }}
          >
            {/* Body (blue shirt) */}
            <div className="relative w-14 h-20 flex flex-col items-center">
              {/* Head */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-amber-200 to-amber-300 border border-amber-400/50" />
              {/* Shirt */}
              <div className="-mt-1 w-14 h-10 rounded-t-2xl bg-gradient-to-b from-sky-400 to-blue-500 shadow-md flex items-start justify-center pt-1">
                <Heart className="w-3 h-3 text-white fill-white" />
              </div>
              {/* Pants */}
              <div className="w-14 h-3 bg-slate-200 rounded-b-md" />
            </div>

            {/* Heart flying to computer */}
            {hearts.includes(i) && (
              <Heart
                className="absolute left-1/2 top-2 w-7 h-7 text-blue-500 fill-blue-500 drop-shadow-lg pointer-events-none"
                style={
                  {
                    // approximate translate from this volunteer to the computer center
                    // tx negative/positive depending on index, ty large negative
                    "--tx": `${(2 - i) * 30}px`,
                    "--ty": `-340px`,
                    animation: "ri-fly 1.2s ease-in forwards",
                    transform: "translateX(-50%)",
                  } as React.CSSProperties
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegisterIntro;
