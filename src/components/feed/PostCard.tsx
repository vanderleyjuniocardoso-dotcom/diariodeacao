import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, Send, Sparkles, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
    volunteer_credential: string | null;
  };
}

interface Props {
  post: FeedPost;
  onOpenComments: (post: FeedPost) => void;
  onOpenMessage: (userId: string, name: string) => void;
  onOpenMotivation: (userId: string, name: string) => void;
  onDeleted?: (id: string) => void;
}

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)}min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)}h`;
  if (s < 604800) return `há ${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export default function PostCard({ post, onOpenComments, onOpenMessage, onOpenMotivation, onDeleted }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ count: lc }, { count: cc }, { data: mine }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        user
          ? supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!mounted) return;
      setLikes(lc ?? 0);
      setCommentsCount(cc ?? 0);
      setLiked(!!mine?.data);
    })();

    const ch = supabase
      .channel(`post-${post.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${post.id}` }, async () => {
        const { count } = await supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id);
        setLikes(count ?? 0);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` }, async () => {
        const { count } = await supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id);
        setCommentsCount(count ?? 0);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [post.id, user?.id]);

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      setLiked(false);
      setLikes((n) => Math.max(0, n - 1));
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikes((n) => n + 1);
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("feed_posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    onDeleted?.(post.id);
  };

  const author = post.author;
  const initials = author?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const isMine = user?.id === post.user_id;

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden">
      <header className="flex items-center gap-3 p-3">
        <Link to={`/voluntario/${post.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden flex-shrink-0">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt={author.full_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{author?.full_name ?? "Voluntário"}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {author?.volunteer_credential || "Voluntário"} · {timeAgo(post.created_at)}
            </p>
          </div>
        </Link>
        {isMine && (
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 rounded-full hover:bg-muted">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {post.image_url && (
        <div className="w-full bg-muted">
          <img src={post.image_url} alt="" className="w-full max-h-[520px] object-cover" loading="lazy" />
        </div>
      )}

      {post.content && (
        <p className="px-4 pt-3 text-sm text-foreground whitespace-pre-wrap break-words">{post.content}</p>
      )}

      <div className="flex items-center gap-1 px-2 py-2">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted transition active:scale-95"
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          <span className="text-xs font-medium">{likes}</span>
        </button>
        <button
          onClick={() => onOpenComments(post)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted transition active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs font-medium">{commentsCount}</span>
        </button>
        {!isMine && (
          <>
            <button
              onClick={() => onOpenMessage(post.user_id, author?.full_name ?? "Voluntário")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-muted transition active:scale-95"
              title="Enviar mensagem"
            >
              <Send className="h-5 w-5" />
            </button>
            <button
              onClick={() => onOpenMotivation(post.user_id, author?.full_name ?? "Voluntário")}
              className="flex items-center gap-1 px-2 py-1.5 ml-auto rounded-full bg-gradient-to-r from-primary/15 to-primary/5 text-primary hover:from-primary/25 transition active:scale-95"
              title="Enviar motivação"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Motivar</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}
