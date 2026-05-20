import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ThreadMessage {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  recipientId: string | null;
  recipientName: string | null;
  recipientAvatar?: string | null;
}

export default function DirectMessageDialog({ open, onClose, recipientId, recipientName, recipientAvatar }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });

  useEffect(() => {
    if (!open || !user || !recipientId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("volunteer_messages")
        .select("id, message, created_at, sender_id, recipient_id")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      setThread(data ?? []);
      scrollToBottom();
      const unread = (data ?? []).filter((m) => m.recipient_id === user.id).map((m) => m.id);
      if (unread.length) {
        await supabase.from("volunteer_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
    })();

    const ch = supabase
      .channel(`dm-${user.id}-${recipientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "volunteer_messages" }, (payload) => {
        const row = payload.new as ThreadMessage;
        const inThread =
          (row.sender_id === user.id && row.recipient_id === recipientId) ||
          (row.sender_id === recipientId && row.recipient_id === user.id);
        if (!inThread) return;
        setThread((prev) => (prev.find((m) => m.id === row.id) ? prev : [...prev, row]));
        scrollToBottom();
        if (row.recipient_id === user.id) {
          supabase.from("volunteer_messages").update({ read_at: new Date().toISOString() }).eq("id", row.id).then(() => {});
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [open, user?.id, recipientId]);

  const send = async () => {
    if (!user || !recipientId) return;
    const t = message.trim();
    if (!t) return;
    if (t.length > 1000) {
      toast({ title: "Mensagem muito longa", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("volunteer_messages").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      message: t,
    });
    if (error) {
      setSending(false);
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    supabase.functions
      .invoke("send-push", {
        body: {
          recipient_id: recipientId,
          title: `Nova mensagem de ${profile?.full_name ?? "um voluntário"}`,
          message: t,
          url: "/volunteers",
        },
      })
      .catch(() => {});
    setSending(false);
    setMessage("");
  };

  const initials = recipientName?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-base">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden flex-shrink-0">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <p className="truncate">{recipientName}</p>
          </DialogTitle>
          <DialogDescription className="sr-only">Conversa</DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
          {thread.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Envie a primeira!</p>
          ) : (
            thread.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p>{m.message}</p>
                    <p
                      className={`text-[10px] mt-1 text-right ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva uma mensagem..."
            rows={1}
            maxLength={1000}
            className="resize-none min-h-[40px] max-h-32"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending) send();
              }
            }}
          />
          <Button onClick={send} disabled={sending || !message.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
