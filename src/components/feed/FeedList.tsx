import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PostCard, { FeedPost } from "./PostCard";

interface Props {
  onOpenComments: (post: FeedPost) => void;
  onOpenMessage: (userId: string, name: string) => void;
  onOpenMotivation: (userId: string, name: string) => void;
}

export default function FeedList({ onOpenComments, onOpenMessage, onOpenMotivation }: Props) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const profilesCache = useRef<Map<string, FeedPost["author"]>>(new Map());

  const enrich = async (rows: any[]): Promise<FeedPost[]> => {
    const missing = rows.map((r) => r.user_id).filter((id) => !profilesCache.current.has(id));
    if (missing.length > 0) {
      const { data } = await supabase
        .from("profiles_public" as any)
        .select("id, full_name, avatar_url, volunteer_credential")
        .in("id", missing);
      (data ?? []).forEach((p: any) =>
        profilesCache.current.set(p.id, {
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          volunteer_credential: p.volunteer_credential,
        }),
      );
    }
    return rows.map((r) => ({ ...r, author: profilesCache.current.get(r.user_id) }));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      const enriched = await enrich(data ?? []);
      setPosts(enriched);
      setLoading(false);
    })();

    const ch = supabase
      .channel("feed-posts-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, async (payload) => {
        const [enriched] = await enrich([payload.new]);
        setPosts((prev) => (prev.find((p) => p.id === enriched.id) ? prev : [enriched, ...prev]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_posts" }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-12">Carregando feed...</p>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-sm text-muted-foreground">
          Nenhuma postagem ainda. Seja o primeiro a compartilhar uma ação ou um pensamento! 💙
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onOpenComments={onOpenComments}
          onOpenMessage={onOpenMessage}
          onOpenMotivation={onOpenMotivation}
          onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
        />
      ))}
    </div>
  );
}
