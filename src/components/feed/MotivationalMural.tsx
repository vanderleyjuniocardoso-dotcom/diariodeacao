import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

interface Item {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_name?: string;
}

export default function MotivationalMural() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("motivational_messages")
        .select("id, content, created_at, sender_id")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const ids = Array.from(new Set((data ?? []).map((m) => m.sender_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      if (!mounted) return;
      setItems((data ?? []).map((m: any) => ({ ...m, sender_name: map.get(m.sender_id) })));
    };

    load();

    const ch = supabase
      .channel(`mural-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "motivational_messages", filter: `recipient_id=eq.${user.id}` },
        load,
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  if (items.length === 0) return null;

  return (
    <div className="px-5 mb-4">
      <div className="flex items-center gap-1.5 mb-2 text-primary">
        <Sparkles className="h-4 w-4" />
        <h2 className="text-sm font-semibold">Mural de motivação</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
        {items.map((m) => (
          <div
            key={m.id}
            className="min-w-[78%] snap-start bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4"
          >
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.content}</p>
            <p className="text-[11px] text-muted-foreground mt-2">
              — {m.sender_name ?? "Voluntário"} ·{" "}
              {new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
