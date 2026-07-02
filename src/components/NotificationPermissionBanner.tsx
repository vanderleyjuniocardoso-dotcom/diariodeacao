import { useEffect, useState } from "react";
import { Bell, X, Share } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "notif_prompt_dismissed_at";

// Platform detection
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
const isStandalone =
  typeof window !== "undefined" &&
  ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.navigator as any).standalone === true);

export default function NotificationPermissionBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"prompt" | "ios-install" | "denied">("prompt");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    // Skip inside Lovable editor iframe
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed = Date.now() - dismissed < 1000 * 60 * 60 * 24 * 3;

    const hasNotificationApi = "Notification" in window;
    const hasPushApi = "serviceWorker" in navigator && "PushManager" in window;

    // iOS: web push only works when installed to home screen (iOS 16.4+)
    if (isIOS && !isStandalone) {
      if (recentlyDismissed) return;
      setMode("ios-install");
      setShow(true);
      return;
    }

    if (!hasNotificationApi || !hasPushApi) return;

    if (Notification.permission === "granted") return;

    if (Notification.permission === "denied") {
      if (recentlyDismissed) return;
      setMode("denied");
      setShow(true);
      return;
    }

    // default → ask
    if (recentlyDismissed) return;
    setMode("prompt");
    setShow(true);
  }, [user?.id]);

  const enable = async () => {
    setLoading(true);
    try {
      const { savePushSubscription } = await import("@/lib/push");
      const sub = await savePushSubscription(user!.id);
      if (!sub) {
        // Check what happened
        if ("Notification" in window && Notification.permission === "denied") {
          setMode("denied");
          toast({
            title: "Permissão bloqueada",
            description: "Ative as notificações nas configurações do navegador.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Não foi possível ativar",
          description: "Verifique as permissões do navegador.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Notificações ativadas!" });
      setShow(false);
    } catch (e: any) {
      toast({ title: "Erro ao ativar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mx-5 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bell className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {mode === "ios-install" ? (
          <>
            <p className="text-sm font-semibold text-foreground">Ative as notificações no iPhone</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Para receber avisos mesmo com o app fechado:
              <br />
              1. Toque em <Share className="inline h-3 w-3 mx-0.5" /> <span className="font-semibold">Compartilhar</span> no Safari
              <br />
              2. Escolha <span className="font-semibold">"Adicionar à Tela de Início"</span>
              <br />
              3. Abra o app pelo ícone e permita as notificações
            </p>
          </>
        ) : mode === "denied" ? (
          <>
            <p className="text-sm font-semibold text-foreground">Notificações bloqueadas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Você bloqueou as notificações. Abra as configurações do navegador/celular para este site e ative "Notificações".
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Ative as notificações</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receba avisos de mensagens, curtidas, motivações, comentários e a reunião de boas-vindas — mesmo com o app fechado.
            </p>
            <button
              onClick={enable}
              disabled={loading}
              className="mt-2 text-xs font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-60"
            >
              {loading ? "Ativando..." : "Permitir notificações"}
            </button>
          </>
        )}
      </div>
      <button onClick={dismiss} className="p-1 -mt-1 -mr-1 text-muted-foreground" aria-label="Fechar">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
