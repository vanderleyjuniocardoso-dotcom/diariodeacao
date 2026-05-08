import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import mascote from "@/assets/mascote-voluntario.png";

const SESSION_KEY = "welcome_shown";

const fireConfetti = () => {
  const duration = 8500;
  const end = Date.now() + duration;
  const colors = ["#22d3ee", "#f43f5e", "#facc15", "#34d399", "#a78bfa", "#fb923c"];

  // Big initial burst
  confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 55,
    origin: { y: 0.6 },
    colors,
  });

  // Side cannons rain
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const WelcomeOverlay = () => {
  const { user, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(true);

    // fire confetti shortly after mount so canvas is ready
    const t1 = setTimeout(() => fireConfetti(), 150);

    // start closing animation
    const t2 = setTimeout(() => setClosing(true), 9400);
    // unmount
    const t3 = setTimeout(() => setShow(false), 10000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading, user?.id]);

  if (!show) return null;

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "voluntário";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 backdrop-blur-sm ${
        closing ? "animate-fade-out" : "animate-fade-in"
      }`}
      onClick={() => {
        setClosing(true);
        setTimeout(() => setShow(false), 400);
      }}
      role="dialog"
      aria-label="Boas-vindas"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center pointer-events-none">
        <img
          src={mascote}
          alt="Mascote do voluntariado dando boas-vindas"
          className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl animate-scale-in"
          style={{ animationDuration: "0.6s" }}
        />
        <div className="animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <p className="text-sm uppercase tracking-widest text-primary font-semibold">
            Bem-vindo(a) de volta
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-1">
            Olá, {firstName}!
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xs">
            Que bom ter você aqui de novo. Vamos transformar vidas hoje? 💛
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
