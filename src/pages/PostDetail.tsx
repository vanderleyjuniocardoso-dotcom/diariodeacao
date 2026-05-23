import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import PostCard, { FeedPost } from "@/components/feed/PostCard";
import CommentsSheet from "@/components/feed/CommentsSheet";
import DirectMessageDialog from "@/components/feed/DirectMessageDialog";
import MotivationalModal from "@/components/feed/MotivationalModal";
import { ArrowLeft, Eye, Heart, MessageCircle } from "lucide-react";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [stats, setStats] = useState({ likes: 0, comments: 0, views: 0 });
  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null);
  const [dm, setDm] = useState<{ id: string; name: string } | null>(null);
  const [mot, setMot] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: p } = await supabase.from("feed_posts").select("*").eq("id", id).maybeSingle();
      if (!p) return;
      const { data: author } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, volunteer_credential")
        .eq("id", p.user_id)
        .maybeSingle();
      setPost({ ...(p as any), author: author ?? undefined });

      // Record view (ignore conflicts on unique constraint)
      await supabase.from("post_views").insert({ post_id: id, user_id: user.id }).select().maybeSingle();
    })();
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ count: l }, { count: c }, { count: v }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", id),
      ]);
      setStats({ likes: l ?? 0, comments: c ?? 0, views: v ?? 0 });
    };
    load();
    const ch = supabase
      .channel(`post-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_views", filter: `post_id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Postagem</h1>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {!post ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <>
            <PostCard
              post={post}
              onOpenComments={setCommentsPost}
              onOpenMessage={(uid, name) => setDm({ id: uid, name })}
              onOpenMotivation={(uid, name) => setMot({ id: uid, name })}
              onDeleted={() => navigate(-1)}
            />

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <Heart className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{stats.likes}</p>
                <p className="text-[10px] text-muted-foreground">Curtidas</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <MessageCircle className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{stats.comments}</p>
                <p className="text-[10px] text-muted-foreground">Comentários</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <Eye className="h-5 w-5 text-foreground mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{stats.views}</p>
                <p className="text-[10px] text-muted-foreground">Visualizações</p>
              </div>
            </div>
          </>
        )}
      </div>

      <CommentsSheet post={commentsPost} onClose={() => setCommentsPost(null)} />
      <DirectMessageDialog
        open={!!dm}
        onClose={() => setDm(null)}
        recipientId={dm?.id ?? null}
        recipientName={dm?.name ?? null}
      />
      <MotivationalModal
        open={!!mot}
        onClose={() => setMot(null)}
        recipientId={mot?.id ?? null}
        recipientName={mot?.name ?? null}
      />
      <BottomNav />
    </div>
  );
}
