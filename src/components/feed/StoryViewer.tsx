import { useEffect, useState } from "react";
import { X, Trash2, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function LikersSheet({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [likers, setLikers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: likes } = await supabase
        .from("story_likes")
        .select("user_id, created_at")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });
      const ids = (likes ?? []).map((l: any) => l.user_id);
      if (ids.length === 0) {
        if (!cancelled) { setLikers([]); setLoading(false); }
        return;
      }
      const { data: profs } = await supabase
        .from("profiles_public" as any)
        .select("id, full_name, avatar_url")
        .in("id", ids);
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const ordered = ids
        .map((id) => pMap.get(id))
        .filter(Boolean)
        .map((p: any) => ({ id: p.id, full_name: p.full_name ?? "Voluntário", avatar_url: p.avatar_url }));
      if (!cancelled) { setLikers(ordered as any); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [storyId]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-background rounded-t-2xl p-4 pb-8 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">Curtidas</h3>
          <button onClick={onClose} className="p-1"><X className="h-5 w-5" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : likers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ninguém curtiu ainda.</p>
        ) : (
          <ul className="space-y-2">
            {likers.map((u) => {
              const initials = u.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <li key={u.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-semibold text-xs">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
                  </div>
                  <span className="text-sm font-medium">{u.full_name}</span>
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500 ml-auto" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}


export interface StoryItem {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface StoryGroup {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  stories: StoryItem[];
}

interface Props {
  groups: StoryGroup[];
  startIndex: number;
  onClose: () => void;
  onDeleted?: () => void;
}

const DURATION = 5000;

export default function StoryViewer({ groups, startIndex, onClose, onDeleted }: Props) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);


  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  // Load like state per story
  useEffect(() => {
    if (!story) return;
    let cancelled = false;
    (async () => {
      const [{ count }, { data: mine }] = await Promise.all([
        supabase.from("story_likes").select("user_id", { count: "exact", head: true }).eq("story_id", story.id),
        user
          ? supabase.from("story_likes").select("user_id").eq("story_id", story.id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      setLikeCount(count ?? 0);
      setLiked(!!mine);
    })();
    return () => { cancelled = true; };
  }, [story?.id, user?.id]);

  const toggleLike = async () => {
    if (!story || !user || likeBusy) return;
    setLikeBusy(true);
    setPaused(true);
    try {
      if (liked) {
        await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", user.id);
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("story_likes").insert({ story_id: story.id, user_id: user.id });
        if (!error) {
          setLiked(true);
          setLikeCount((c) => c + 1);
          // Notify story owner (mobile push even with app closed)
          if (story.user_id !== user.id) {
            const senderName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "Alguém";
            supabase.functions.invoke("send-push", {
              body: {
                recipient_id: story.user_id,
                title: "Curtiram seu story ❤️",
                message: `${senderName} curtiu seu story`,
                url: "/volunteers",
              },
            }).catch(() => {});
          }
        }
      }
    } finally {
      setLikeBusy(false);
      setTimeout(() => setPaused(false), 300);
    }
  };


  useEffect(() => {
    setStoryIdx(0);
    setProgress(0);
  }, [groupIdx]);

  useEffect(() => {
    if (!story || paused) return;
    setProgress(0);
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / DURATION) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        next();
      }
    }, 50);
    return () => clearInterval(t);
  }, [story?.id, paused]);

  const next = () => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(storyIdx + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(groupIdx + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1);
    }
  };

  const deleteOwn = async () => {
    if (!story || story.user_id !== user?.id) return;
    await supabase.from("stories").delete().eq("id", story.id);
    onDeleted?.();
    onClose();
  };

  if (!group || !story) return null;

  const initials = group.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const isMine = story.user_id === user?.id;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2 pt-3">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-[width]"
              style={{
                width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/15 overflow-hidden flex items-center justify-center text-white text-[10px] font-semibold">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <p className="text-sm text-white font-medium truncate max-w-[60vw]">
            {isMine ? "Você" : group.full_name}
          </p>
          <span className="text-[10px] text-white/70">
            {Math.floor((Date.now() - new Date(story.created_at).getTime()) / 3600000)}h
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMine && (
            <button onClick={deleteOwn} className="p-2 text-white/90 active:scale-95">
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-white active:scale-95">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Image w/ tap zones */}
      <div
        className="flex-1 relative select-none"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <img
          src={story.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
        <button
          onClick={prev}
          className="absolute left-0 top-0 bottom-0 w-1/3"
          aria-label="Anterior"
        />
        <button
          onClick={next}
          className="absolute right-0 top-0 bottom-0 w-1/3"
          aria-label="Próximo"
        />
        {story.caption && (
          <p className="absolute bottom-20 left-4 right-4 text-center text-sm text-white bg-black/40 rounded-lg px-3 py-2">
            {story.caption}
          </p>
        )}
        {/* Like button / owner stats */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center gap-2 pointer-events-none z-20"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
        >
          {isMine ? (
            <button
              onClick={() => { setPaused(true); setLikersOpen(true); }}
              className="pointer-events-auto flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-5 py-2.5 text-white active:scale-95 transition"
              aria-label="Ver quem curtiu"
            >
              <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
              <span className="text-sm font-semibold">{likeCount}</span>
              <span className="text-xs text-white/80">{likeCount === 1 ? "curtida" : "curtidas"}</span>
            </button>
          ) : (
            <button
              onClick={toggleLike}
              disabled={likeBusy}
              className="pointer-events-auto flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-5 py-2.5 text-white active:scale-95 transition shadow-lg"
              aria-label={liked ? "Descurtir story" : "Curtir story"}
            >
              <Heart
                className={`h-7 w-7 ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`}
              />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
          )}
        </div>

      </div>

      {likersOpen && (
        <LikersSheet
          storyId={story.id}
          onClose={() => { setLikersOpen(false); setTimeout(() => setPaused(false), 200); }}
        />
      )}


      </div>
    </div>
  );
}
