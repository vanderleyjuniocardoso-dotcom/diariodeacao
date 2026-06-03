import { useEffect, useRef, useState } from "react";
import { Plus, Loader2, Camera, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import StoryViewer, { StoryGroup } from "./StoryViewer";

interface Row {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

export default function StoriesBar() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("stories")
      .select("id, user_id, image_url, caption, created_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Row[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : { data: [] };
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const map = new Map<string, StoryGroup>();
    rows.forEach((r) => {
      const g = map.get(r.user_id) ?? {
        user_id: r.user_id,
        full_name: (pMap.get(r.user_id) as any)?.full_name ?? "Voluntário",
        avatar_url: (pMap.get(r.user_id) as any)?.avatar_url ?? null,
        stories: [],
      };
      g.stories.push(r);
      map.set(r.user_id, g);
    });
    // Put own group first if exists
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      return 0;
    });
    setGroups(arr);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("stories-bar")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx 5MB)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("stories").getPublicUrl(path);
      const { error: insErr } = await supabase
        .from("stories")
        .insert({ user_id: user.id, image_url: pub.publicUrl });
      if (insErr) throw insErr;
      toast({ title: "Story publicado!" });
    } catch (err: any) {
      toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const myGroup = groups.find((g) => g.user_id === user?.id);
  const myInitials =
    profile?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <div className="border-b border-border">
      <div className="flex gap-3 overflow-x-auto px-5 py-3 scrollbar-hide">
        {/* Add / your story */}
        <button
          onClick={() => {
            if (uploading) return;
            setPickerOpen(true);
          }}
          className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover opacity-90" />
              ) : (
                <span className="text-sm font-semibold text-primary">{myInitials}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </div>
          </div>
          <span className="text-[10px] text-foreground max-w-[64px] truncate">Seu story</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />

        {groups.map((g, i) => {
          if (g.user_id === user?.id && g === myGroup) {
            // Replace own placeholder with viewable ring on the add button instead — render as separate clickable
          }
          const initials = g.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
          return (
            <button
              key={g.user_id}
              onClick={() => setOpenIndex(i)}
              className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition"
            >
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-primary">
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden">
                    {g.avatar_url ? (
                      <img src={g.avatar_url} alt={g.full_name} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-foreground max-w-[64px] truncate">
                {g.user_id === user?.id ? "Você" : g.full_name?.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <StoryViewer
          groups={groups}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          onDeleted={load}
        />
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full bg-background rounded-t-2xl p-4 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">Novo story</h3>
              <button onClick={() => setPickerOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => {
                setPickerOpen(false);
                cameraInput.current?.click();
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border active:bg-muted transition mb-2"
            >
              <Camera className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">Abrir câmera</p>
                <p className="text-xs text-muted-foreground">Tirar foto agora e publicar</p>
              </div>
            </button>
            <button
              onClick={() => {
                setPickerOpen(false);
                fileInput.current?.click();
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border active:bg-muted transition"
            >
              <ImageIcon className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">Escolher da galeria</p>
                <p className="text-xs text-muted-foreground">Selecionar uma foto existente</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
