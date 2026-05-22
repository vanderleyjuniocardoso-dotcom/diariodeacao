import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Users, Plus, Home, Send, User as UserIcon, UsersRound } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import VolunteersIntro from "@/components/VolunteersIntro";
import FeedList from "@/components/feed/FeedList";
import CreatePostModal from "@/components/feed/CreatePostModal";
import CommentsSheet from "@/components/feed/CommentsSheet";
import MotivationalModal from "@/components/feed/MotivationalModal";
import MotivationalMural from "@/components/feed/MotivationalMural";
import DirectMessageDialog from "@/components/feed/DirectMessageDialog";
import StoriesBar from "@/components/feed/StoriesBar";
import AdminBroadcastBanner from "@/components/feed/AdminBroadcastBanner";
import VolunteersListSheet from "@/components/feed/VolunteersListSheet";
import type { FeedPost } from "@/components/feed/PostCard";


interface VolunteerRow {
  id: string;
  full_name: string;
  volunteer_level: number;
  avatar_url: string | null;
  volunteer_credential: string | null;
  donated_hours: number;
}

interface Conversation {
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

const Volunteers = () => {
  const { user } = useAuth();
  const [list, setList] = useState<VolunteerRow[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null);
  const [motivation, setMotivation] = useState<{ id: string; name: string } | null>(null);
  const [dm, setDm] = useState<{ id: string; name: string; avatar?: string | null } | null>(null);
  const [volunteersListOpen, setVolunteersListOpen] = useState(false);


  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
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
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("volunteer_messages")
        .select("id, message, created_at, sender_id, recipient_id, read_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(300);

      const map = new Map<string, Conversation>();
      const otherIds = new Set<string>();
      (data ?? []).forEach((m: any) => {
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        otherIds.add(other);
        if (!map.has(other)) {
          map.set(other, {
            other_id: other,
            other_name: "",
            other_avatar: null,
            last_message: m.message,
            last_at: m.created_at,
            unread: 0,
          });
        }
        if (m.recipient_id === user.id && !m.read_at) {
          map.get(other)!.unread += 1;
        }
      });

      if (otherIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", Array.from(otherIds));
        (profs ?? []).forEach((p: any) => {
          const c = map.get(p.id);
          if (c) {
            c.other_name = p.full_name;
            c.other_avatar = p.avatar_url;
          }
        });
      }

      setConversations(Array.from(map.values()).sort((a, b) => (a.last_at < b.last_at ? 1 : -1)));
    };

    load();
    const ch = supabase
      .channel(`conversations-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "volunteer_messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {showIntro && list.length > 0 && (
        <VolunteersIntro volunteers={list} onDone={() => setShowIntro(false)} />
      )}
      <div className="gradient-hero px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-foreground" />
            <h1 className="text-xl font-bold font-heading text-primary-foreground tracking-tight">VOLUNTAGRAM</h1>
          </div>
          <button
            onClick={() => setVolunteersListOpen(true)}
            className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground rounded-full p-2 transition active:scale-95"
            aria-label="Ver todos os voluntários"
            title="Ver todos os voluntários"
          >
            <UsersRound className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-primary-foreground/80 mt-1">
          Compartilhe momentos, motive e conecte-se com outros voluntários.
        </p>
      </div>


      <Tabs defaultValue="feed" className="mt-4">
        <div className="px-5">
          <TabsList className="w-full grid grid-cols-3 h-12">
            <TabsTrigger value="feed" className="gap-1.5">
              <Home className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 relative">
              <Send className="h-5 w-5" />
              {conversations.reduce((s, c) => s + c.unread, 0) > 0 && (
                <span className="absolute top-1.5 right-1/2 translate-x-4 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            {user && (
              <Link
                to={`/voluntario/${user.id}`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-all hover:bg-background/50"
                aria-label="Meu perfil"
              >
                <UserIcon className="h-5 w-5" />
              </Link>
            )}
          </TabsList>
        </div>

        <TabsContent value="feed" className="mt-3">
          <StoriesBar />
          <MotivationalMural />
          <div className="px-5">
            <FeedList
              onOpenComments={setCommentsPost}
              onOpenMessage={(id, name) => setDm({ id, name })}
              onOpenMotivation={(id, name) => setMotivation({ id, name })}
            />
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-4 px-5 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma conversa ainda. Toque em um voluntário no feed para começar.
            </p>
          ) : (
            conversations.map((c) => {
              const initials = c.other_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              return (
                <button
                  key={c.other_id}
                  onClick={() => setDm({ id: c.other_id, name: c.other_name, avatar: c.other_avatar })}
                  className="w-full text-left bg-card border border-border rounded-xl p-3 flex items-center gap-3 transition active:scale-[0.99]"
                >
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0 overflow-hidden">
                    {c.other_avatar ? (
                      <img src={c.other_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{c.other_name || "Voluntário"}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(c.last_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {c.unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </TabsContent>
      </Tabs>


      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition z-30"
        title="Nova postagem"
      >
        <Plus className="h-6 w-6" />
      </button>

      <CreatePostModal open={createOpen} onOpenChange={setCreateOpen} />
      <CommentsSheet post={commentsPost} onClose={() => setCommentsPost(null)} />
      <MotivationalModal
        open={!!motivation}
        onClose={() => setMotivation(null)}
        recipientId={motivation?.id ?? null}
        recipientName={motivation?.name ?? null}
      />
      <DirectMessageDialog
        open={!!dm}
        onClose={() => setDm(null)}
        recipientId={dm?.id ?? null}
        recipientName={dm?.name ?? null}
        recipientAvatar={dm?.avatar ?? null}
      />

      <BottomNav />
    </div>
  );
};

export default Volunteers;
