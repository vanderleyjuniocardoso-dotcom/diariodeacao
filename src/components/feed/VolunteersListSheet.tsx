import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search, BadgeCheck, Clock, Trophy } from "lucide-react";

interface VolunteerRow {
  id: string;
  full_name: string;
  volunteer_level: number;
  avatar_url: string | null;
  volunteer_credential: string | null;
  donated_hours: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function VolunteersListSheet({ open, onOpenChange }: Props) {
  const [list, setList] = useState<VolunteerRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: profiles } = await supabase
        .from("profiles_public" as any)
        .select("id, full_name, volunteer_level, avatar_url, volunteer_credential")
        .order("full_name", { ascending: true });
      const { data: actions } = await supabase.from("volunteer_actions").select("user_id, donated_hours");
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
      setLoading(false);
    })();
  }, [open]);

  const filtered = list.filter(
    (v) =>
      v.full_name?.toLowerCase().includes(q.toLowerCase()) ||
      v.volunteer_credential?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Voluntários cadastrados</SheetTitle>
        </SheetHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou credencial..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum voluntário encontrado.</p>
          ) : (
            filtered.map((v) => {
              const initials = v.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              return (
                <Link
                  key={v.id}
                  to={`/voluntario/${v.id}`}
                  onClick={() => onOpenChange(false)}
                  className="block bg-card border border-border rounded-xl p-3 flex items-center gap-3 active:scale-[0.99] transition"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-foreground truncate">{v.full_name}</p>
                      {v.volunteer_credential && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> Nível {v.volunteer_level}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {v.donated_hours}h
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
