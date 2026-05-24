import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";

interface Props {
  avatarUrl?: string | null;
  fullName?: string;
  onDone: () => void;
}

/**
 * GGL intro: avatar walks to a hospital/unit building labeled "GGL",
 * enters, then the building zooms in until it fills the screen and fades.
 * Total duration ~5s. Click to skip.
 */
const GglIntro = ({ avatarUrl, fullName, onDone }: Props) => {
  // 0: approach, 1: enter, 2: zoom, 3: fade out
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 2000); // approach -> enter
    const t2 = window.setTimeout(() => setPhase(2), 2800); // start zoom
    const t3 = window.setTimeout(() => setPhase(3), 4500); // fade
    const t4 = window.setTimeout(() => onDone(), 5000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  const initials = fullName?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      onClick={onDone}
      className={`fixed inset-0 z-[70] cursor-pointer overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50 transition-opacity duration-500 ${
        phase === 3 ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* sun */}
      <div className="absolute top-10 right-12 w-16 h-16 rounded-full bg-yellow-300/80 blur-sm" />

      {/* ground */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-emerald-100 to-emerald-200" />

      {/* building */}
      <div
        className="absolute left-1/2 bottom-[33%] origin-bottom transition-all duration-[1500ms] ease-in-out"
        style={{
          transform:
            phase >= 2
              ? "translateX(-50%) scale(12)"
              : "translateX(-50%) scale(1)",
        }}
      >
        <div className="relative w-44 h-52 -translate-x-1/2 left-1/2">
          {/* main building */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-white rounded-t-lg shadow-2xl border-2 border-slate-200">
            {/* roof band */}
            <div className="absolute top-0 inset-x-0 h-10 bg-primary flex items-center justify-center rounded-t-md">
              <span className="text-primary-foreground font-extrabold tracking-widest text-lg">GGL</span>
            </div>
            {/* red cross */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-8 h-8">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-red-500 rounded-sm" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2 bg-red-500 rounded-sm" />
            </div>
            {/* windows */}
            <div className="absolute top-24 left-3 right-3 grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-sky-300/80 rounded-sm" />
              ))}
            </div>
            {/* door */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-12 bg-slate-700 rounded-t-md" />
          </div>
        </div>
      </div>

      {/* avatar walking toward building */}
      <div
        className="absolute bottom-[34%] transition-all duration-[1800ms] ease-in-out"
        style={{
          left: phase === 0 ? "8%" : "calc(50% - 28px)",
          opacity: phase >= 1 ? 0 : 1,
          transform: phase >= 1 ? "scale(0.6)" : "scale(1)",
        }}
      >
        <div className="w-14 h-14 rounded-full bg-primary/20 border-4 border-primary shadow-lg overflow-hidden flex items-center justify-center text-primary font-bold">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName || "Voluntário"} className="w-full h-full object-cover" />
          ) : initials ? (
            <span>{initials}</span>
          ) : (
            <UserIcon className="h-6 w-6" />
          )}
        </div>
      </div>

      {/* connection dots */}
      {phase === 0 && (
        <div className="absolute bottom-[40%] left-[20%] right-[42%] flex items-center justify-between pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/70 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* caption */}
      <div className="absolute top-16 inset-x-0 text-center px-6">
        <p className="text-primary font-bold text-lg drop-shadow-sm">
          {phase < 2 ? "Conectando você ao seu GGL..." : "Bem-vindo ao seu GGL"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">toque para pular</p>
      </div>
    </div>
  );
};

export default GglIntro;
