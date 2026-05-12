import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Users, Trophy, Clock, BadgeCheck, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import VolunteersIntro from "@/components/VolunteersIntro";

interface ThreadMessage {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
}

interface VolunteerRow {
  id: string;
  full_name: string;
  volunteer_level: number;
  avatar_url: string | null;
  volunteer_credential: string | null;
  donated_hours: number;
}

const Volunteers = () => {
  const [list, setList] = useState<VolunteerRow[]>([]);
  const [selected, setSelected] = useState<VolunteerRow | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, volunteer_level, avatar_url, volunteer_credential")
        .order("full_name", { ascending: true });

      const { data: actions } = await supabase
        .from("volunteer_actions")
        .select("user_id, donated_hours");

      const hoursByUser = new Map<string, number>();
      (actions ?? []).forEach((a: any) => {
        hoursByUser.set(a.user_id, (hoursByUser.get(a.user_id) ?? 0) + Number(a.donated_hours ?? 0));
      });

      setList(
        (profiles ?? []).map((p: any) => ({
          ...p,
          donated_hours: hoursByUser.get(p.id) ?? 0,
        })),
      );
    })();
  }, []);

  const openDialog = (v: VolunteerRow) => {
    setSelected(v);
    setMessage("");
    setThread([]);
  };

  // Carrega histórico + realtime quando abre conversa
  useEffect(() => {
    if (!user || !selected) return;
    let cancelled = false;

    (async () => {
      setLoadingThread(true);
      const { data } = await supabase
        .from("volunteer_messages")
        .select("id, message, created_at, sender_id, recipient_id")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${selected.id}),and(sender_id.eq.${selected.id},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      setThread(data ?? []);
      setLoadingThread(false);
      scrollToBottom();

      // Marca recebidas como lidas
      const unreadIds = (data ?? [])
        .filter((m: any) => m.recipient_id === user.id)
        .map((m: any) => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("volunteer_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
    })();

    const channel = supabase
      .channel(`thread-${user.id}-${selected.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "volunteer_messages" },
        (payload) => {
          const row = payload.new as ThreadMessage;
          const inThread =
            (row.sender_id === user.id && row.recipient_id === selected.id) ||
            (row.sender_id === selected.id && row.recipient_id === user.id);
          if (!inThread) return;
          setThread((prev) => (prev.find((m) => m.id === row.id) ? prev : [...prev, row]));
          scrollToBottom();
          if (row.recipient_id === user.id) {
            supabase
              .from("volunteer_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", row.id)
              .then(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id, selected?.id]);

  const sendMessage = async () => {
    if (!user || !selected) return;
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: "Escreva uma mensagem", variant: "destructive" });
      return;
    }
    if (trimmed.length > 1000) {
      toast({ title: "Mensagem muito longa (máx. 1000)", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("volunteer_messages").insert({
      sender_id: user.id,
      recipient_id: selected.id,
      message: trimmed,
    });
    if (error) {
      setSending(false);
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    // Dispara notificação push para o destinatário (best-effort)
    supabase.functions
      .invoke("send-push", {
        body: {
          recipient_id: selected.id,
          title: `Nova mensagem de ${user.user_metadata?.full_name || "um voluntário"}`,
          message: trimmed,
          url: "/",
        },
      })
      .catch((e) => console.error("send-push error", e));
    setSending(false);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-hero px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary-foreground" />
          <h1 className="text-xl font-bold font-heading text-primary-foreground">Voluntários</h1>
        </div>
        <p className="text-sm text-primary-foreground/80 mt-1">Toque em um voluntário para deixar um recado.</p>
      </div>

      <div className="px-5 mt-6 space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum voluntário encontrado.</p>
        ) : (
          list.map((v) => {
            const initials = v.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            const isSelf = user?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => !isSelf && openDialog(v)}
                disabled={isSelf}
                className="w-full text-left glass-card rounded-xl p-4 flex items-center gap-3 transition active:scale-[0.99] disabled:opacity-70 disabled:cursor-default"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                  {v.avatar_url ? (
                    <img src={v.avatar_url} alt={v.full_name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {v.full_name} {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{v.volunteer_credential || "Sem credencial"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <Trophy className="h-3.5 w-3.5" />
                      Nível {v.volunteer_level === 2 ? 2 : 1}
                    </span>
                    <span className="flex items-center gap-1 text-foreground font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      {v.donated_hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3 text-base">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0 overflow-hidden">
                {selected?.avatar_url ? (
                  <img src={selected.avatar_url} alt={selected.full_name} className="w-full h-full object-cover" />
                ) : (
                  selected?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{selected?.full_name}</p>
                <p className="text-[11px] font-normal text-muted-foreground truncate">
                  {selected?.volunteer_credential || "Voluntário"}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Conversa com {selected?.full_name}</DialogDescription>
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
            {loadingThread ? (
              <p className="text-xs text-muted-foreground text-center py-8">Carregando conversa...</p>
            ) : thread.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhuma mensagem ainda. Envie a primeira!
              </p>
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
                  if (!sending) sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} disabled={sending || !message.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Volunteers;
