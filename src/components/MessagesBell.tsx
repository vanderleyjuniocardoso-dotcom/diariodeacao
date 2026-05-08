import { useEffect, useState } from "react";
import { Bell, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface MessageRow {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  read_at: string | null;
  sender_name?: string;
  sender_avatar?: string | null;
}

const MessagesBell = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [open, setOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const unreadCount = messages.filter((m) => !m.read_at).length;

  const loadMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("volunteer_messages")
      .select("id, message, created_at, sender_id, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data) return;

    const senderIds = Array.from(new Set(data.map((m) => m.sender_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", senderIds);
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    setMessages(
      data.map((m) => ({
        ...m,
        sender_name: map.get(m.sender_id)?.full_name ?? "Voluntário",
        sender_avatar: map.get(m.sender_id)?.avatar_url ?? null,
      })),
    );
  };

  // Inscreve para Push (notificações com app fechado)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { subscribeToPush, isInIframe } = await import("@/lib/push");
        if (isInIframe) return;
        const sub = await subscribeToPush();
        if (!sub) return;
        const json: any = sub.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" },
        );
      } catch (e) {
        console.error("push subscribe failed", e);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    loadMessages();

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "volunteer_messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as any;
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", row.sender_id)
            .single();
          const name = sender?.full_name ?? "Voluntário";

          toast(`Nova mensagem de ${name}`, {
            description: row.message,
            action: {
              label: "Ver",
              onClick: () => setOpen(true),
            },
          });

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`Nova mensagem de ${name}`, {
                body: row.message,
                icon: "/placeholder.svg",
              });
            } catch {}
          }

          setMessages((prev) => [
            {
              id: row.id,
              message: row.message,
              created_at: row.created_at,
              sender_id: row.sender_id,
              read_at: row.read_at,
              sender_name: name,
              sender_avatar: sender?.avatar_url ?? null,
            },
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleOpen = async () => {
    setOpen(true);
    if (!user) return;
    const unreadIds = messages.filter((m) => !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    await supabase
      .from("volunteer_messages")
      .update({ read_at: now })
      .in("id", unreadIds);
    setMessages((prev) => prev.map((m) => (m.read_at ? m : { ...m, read_at: now })));
  };

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Mensagens"
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mensagens</DialogTitle>
            <DialogDescription>
              Recados enviados por outros voluntários.
            </DialogDescription>
          </DialogHeader>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Você ainda não tem mensagens.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const initials = (m.sender_name ?? "")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={m.id} className="rounded-xl border border-border p-3 flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0 overflow-hidden">
                      {m.sender_avatar ? (
                        <img src={m.sender_avatar} alt={m.sender_name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-foreground truncate">
                          {m.sender_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
                        {m.message}
                      </p>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplyTo(m);
                            setReplyText("");
                          }}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Responder
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!replyTo} onOpenChange={(o) => !o && setReplyTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder mensagem</DialogTitle>
            <DialogDescription>
              Resposta para <span className="font-semibold text-foreground">{replyTo?.sender_name}</span>.
            </DialogDescription>
          </DialogHeader>
          {replyTo && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground/80 mb-1">Mensagem original:</p>
              <p className="whitespace-pre-wrap break-words">{replyTo.message}</p>
            </div>
          )}
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escreva sua resposta..."
            rows={5}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{replyText.length}/1000</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReplyTo(null)} disabled={sendingReply}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!user || !replyTo) return;
                const trimmed = replyText.trim();
                if (!trimmed) {
                  toast.error("Escreva uma resposta");
                  return;
                }
                setSendingReply(true);
                const { error } = await supabase.from("volunteer_messages").insert({
                  sender_id: user.id,
                  recipient_id: replyTo.sender_id,
                  message: trimmed,
                });
                setSendingReply(false);
                if (error) {
                  toast.error("Erro ao enviar", { description: error.message });
                  return;
                }
                toast.success(`Resposta enviada para ${replyTo.sender_name}`);
                setReplyTo(null);
                setReplyText("");
              }}
              disabled={sendingReply}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingReply ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessagesBell;
