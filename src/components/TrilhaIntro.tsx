import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface Props {
  avatarUrl?: string | null;
  fullName?: string;
  requirements: string[];
  onDone: () => void;
}

const TrilhaIntro = ({ avatarUrl, fullName, requirements, onDone }: Props) => {
  const [step, setStep] = useState(-1); // -1 antes de começar, 0..n-1 enquanto sobe, n quando termina

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStep(0), 400));
    requirements.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), 400 + (i + 1) * 900));
    });
    timers.push(window.setTimeout(() => onDone(), 400 + requirements.length * 900 + 900));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [requirements.length, onDone]);

  const initials = fullName?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const stepHeight = 56; // px por degrau
  const stepWidth = 90;
  const total = requirements.length;
  const currentIndex = Math.max(0, Math.min(step, total));

  return (
    <div onClick={onDone} className="fixed inset-0 z-[60] bg-gradient-to-b from-sky-200 via-sky-100 to-white overflow-hidden cursor-pointer">
      {/* Nuvens */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { top: "8%", size: 90, delay: "0s", duration: "28s", opacity: 0.85 },
          { top: "22%", size: 130, delay: "-6s", duration: "36s", opacity: 0.7 },
          { top: "45%", size: 70, delay: "-12s", duration: "24s", opacity: 0.75 },
          { top: "68%", size: 110, delay: "-3s", duration: "32s", opacity: 0.6 },
          { top: "82%", size: 80, delay: "-18s", duration: "30s", opacity: 0.7 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: c.top,
              left: "-20%",
              width: c.size,
              height: c.size * 0.55,
              opacity: c.opacity,
              animation: `trilha-cloud ${c.duration} linear infinite`,
              animationDelay: c.delay,
            }}
          >
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-white rounded-full blur-md" />
              <div className="absolute left-[15%] top-[10%] w-[55%] h-[80%] bg-white rounded-full blur-md" />
              <div className="absolute right-[10%] top-[20%] w-[45%] h-[70%] bg-white rounded-full blur-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Escada + degraus */}
      <div className="relative h-full w-full flex items-end justify-center pb-16">
        <div
          className="relative"
          style={{
            width: stepWidth * (total + 1),
            height: stepHeight * (total + 1),
          }}
        >
          {requirements.map((req, i) => {
            const passed = i < currentIndex;
            return (
              <div
                key={i}
                className="absolute flex items-center"
                style={{
                  left: i * stepWidth,
                  bottom: i * stepHeight,
                  width: stepWidth,
                  height: stepHeight,
                }}
              >
                {/* Degrau */}
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm border-2 border-primary/40 rounded-lg shadow-[var(--shadow-card)]" />
                {/* Conteúdo: requisito ou coração */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 text-center">
                  {passed ? (
                    <div className="flex justify-center animate-scale-in">
                      <Heart className="h-7 w-7 text-primary fill-primary drop-shadow" />
                    </div>
                  ) : (
                    <p className="text-[11px] font-semibold text-foreground bg-white/90 rounded-md px-1.5 py-1 shadow-sm leading-tight">
                      {req}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Avatar do voluntário */}
          <div
            className="absolute transition-all duration-700 ease-out"
            style={{
              left: currentIndex * stepWidth + stepWidth / 2 - 28,
              bottom: currentIndex * stepHeight + stepHeight,
            }}
          >
            <div className="w-14 h-14 rounded-full bg-primary/20 border-4 border-primary shadow-[var(--shadow-elevated)] overflow-hidden flex items-center justify-center text-primary font-bold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName || "Voluntário"} className="w-full h-full object-cover" />
              ) : (
                <span>{initials || "V"}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes trilha-cloud {
          0% { transform: translateX(0); }
          100% { transform: translateX(140vw); }
        }
      `}</style>
    </div>
  );
};

export default TrilhaIntro;
