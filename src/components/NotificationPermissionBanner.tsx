import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "notif_prompt_dismissed_at";

export default function NotificationPermissionBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const isInIframe = window.self !== window.top;
      if (isInIframe) return;
    } catch {
      return;
    }
    if (Notification.permission !== "default") return;
    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - last < 1000 * 60 * 60 * 24 * 3) return; // dismiss for 3 days
    setShow(true);
  }, [user?.id]);

  const enable = async () => {
    setLoading(true);
    try {
      const { savePushSubscription } = await import("@/lib/push");
      const sub = await savePushSubscription(user!.id);
      if (!sub) {
        toast({ title: "Não foi possível ativar", description: "Verifique as permissões do navegador.", variant: "destructive" });
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
        <p className="text-sm font-semibold text-foreground">Ative as notificações</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Receba avisos de mensagens, curtidas, motivações, comentários e a reunião de boas-vindas.
        </p>
        <button
          onClick={enable}
          disabled={loading}
          className="mt-2 text-xs font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-60"
        >
          {loading ? "Ativando..." : "Ativar agora"}
        </button>
      </div>
      <button onClick={dismiss} className="p-1 -mt-1 -mr-1 text-muted-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
