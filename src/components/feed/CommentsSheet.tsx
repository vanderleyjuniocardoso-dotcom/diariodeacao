import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FeedPost } from "./PostCard";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null };
}

interface Props {
  post: FeedPost | null;
  onClose: () => void;
}

export default function CommentsSheet({ post, onClose }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true })
        .limit(200);
      const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] };
      const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      if (!mounted) return;
      setComments(
        (data ?? []).map((c: any) => ({
          ...c,
          author: profMap.get(c.user_id) as any,
        })),
      );
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    };

    load();

    const ch = supabase
      .channel(`comments-${post.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` },
        async (payload) => {
          const row = payload.new as any;
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();
          setComments((prev) =>
            prev.find((c) => c.id === row.id) ? prev : [...prev, { ...row, author: prof ?? undefined }],
          );
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [post?.id]);

  const send = async () => {
    if (!user || !post) return;
    const t = text.trim();
    if (!t) return;
    if (t.length > 500) {
      toast({ title: "Comentário muito longo (máx 500)", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: post.id,
      user_id: user.id,
      content: t,
    });
    setSending(false);
    if (error) {
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
  };

  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col rounded-t-2xl">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-base">Comentários</SheetTitle>
          <SheetDescription className="sr-only">Comentários do post</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum comentário ainda. Seja o primeiro!
            </p>
          ) : (
            comments.map((c) => {
              const initials = c.author?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              return (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold flex-shrink-0 overflow-hidden">
                    {c.author?.avatar_url ? (
                      <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="font-semibold text-foreground">{c.author?.full_name ?? "Voluntário"}</span>{" "}
                      <span className="text-foreground whitespace-pre-wrap break-words">{c.content}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(c.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Adicione um comentário..."
            rows={1}
            maxLength={500}
            className="resize-none min-h-[40px] max-h-24"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending) send();
              }
            }}
          />
          <Button onClick={send} disabled={sending || !text.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
