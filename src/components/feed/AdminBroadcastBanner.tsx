import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Megaphone, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
  sender_id: string;
}

export default function AdminBroadcastBanner() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Broadcast[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissed_broadcasts") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setItems(data ?? []);
    })();

    const ch = supabase
      .channel("admin-broadcasts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_broadcasts" }, (p) => {
        setItems((prev) => [p.new as Broadcast, ...prev].slice(0, 5));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_broadcasts", JSON.stringify(Array.from(next)));
  };

  const send = async () => {
    if (!user || !title.trim() || !message.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("admin_broadcasts")
      .insert({ sender_id: user.id, title: title.trim(), message: message.trim() });
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar aviso");
      return;
    }
    toast.success("Aviso enviado a todos os voluntários!");
    setTitle("");
    setMessage("");
    setComposeOpen(false);

    // dispara push para todos (best-effort)
    supabase.functions
      .invoke("send-push", {
        body: {
          broadcast: true,
          title: `📢 ${title.trim()}`,
          body: message.trim(),
          url: "/volunteers",
        },
      })
      .catch(() => {});
  };

  const visible = items.filter((i) => !dismissed.has(i.id));

  return (
    <div className="px-5 space-y-2">
      {isAdmin && (
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary rounded-xl px-3 py-2 text-sm font-medium active:scale-[0.99] transition"
        >
          <Megaphone className="h-4 w-4" />
          <span>Enviar aviso para todos os voluntários</span>
          <Plus className="h-4 w-4 ml-auto" />
        </button>
      )}

      {visible.map((b) => (
        <div
          key={b.id}
          className="relative bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 rounded-xl p-3 pr-8"
        >
          <button
            onClick={() => dismiss(b.id)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Mensagem do ADM
            </p>
          </div>
          <p className="font-semibold text-sm text-foreground">{b.title}</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-0.5">{b.message}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(b.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova mensagem do ADM</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título do aviso"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
            <Textarea
              placeholder="Escreva a mensagem que será enviada a todos os voluntários..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={send} disabled={sending || !title.trim() || !message.trim()}>
              {sending ? "Enviando..." : "Enviar para todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
