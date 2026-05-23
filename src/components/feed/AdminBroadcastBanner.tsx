import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
  sender_id: string;
}

export default function AdminBroadcastBanner() {
  const [items, setItems] = useState<Broadcast[]>([]);
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

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="px-5 space-y-2">
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
    </div>
  );
}

