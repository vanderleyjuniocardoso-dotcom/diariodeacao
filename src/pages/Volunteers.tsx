import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Users, Trophy, Clock, BadgeCheck, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  };

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
    toast({ title: "Recado enviado!", description: `Sua mensagem foi enviada para ${selected.full_name}.` });
    setSelected(null);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deixar um recado</DialogTitle>
            <DialogDescription>
              Envie uma mensagem para <span className="font-semibold text-foreground">{selected?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva uma mensagem ou recado..."
            rows={5}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={sendMessage} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Volunteers;
