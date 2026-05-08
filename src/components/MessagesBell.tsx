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

  // Pede permissão de notificação
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessagesBell;
