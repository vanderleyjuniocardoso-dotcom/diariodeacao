import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BadgeCheck, Clock, Trophy, Send, Sparkles, Pencil, Check, X } from "lucide-react";
import DirectMessageDialog from "@/components/feed/DirectMessageDialog";
import MotivationalModal from "@/components/feed/MotivationalModal";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  volunteer_credential: string | null;
  volunteer_level: number;
  bio: string | null;
}

interface Post {
  id: string;
  image_url: string | null;
  content: string;
  created_at: string;
}

export default function VolunteerProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hours, setHours] = useState(0);
  const [editBio, setEditBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [dmOpen, setDmOpen] = useState(false);
  const [motOpen, setMotOpen] = useState(false);

  const isMe = user?.id === id;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: p }, { data: ps }, { data: acts }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, volunteer_credential, volunteer_level, bio").eq("id", id).maybeSingle(),
        supabase.from("feed_posts").select("id, image_url, content, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(60),
        supabase.from("volunteer_actions").select("donated_hours").eq("user_id", id),
      ]);
      setProfile(p as Profile);
      setBioDraft(p?.bio ?? "");
      setPosts(ps ?? []);
      setHours((acts ?? []).reduce((s: number, a: any) => s + Number(a.donated_hours ?? 0), 0));
    })();
  }, [id]);

  const saveBio = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ bio: bioDraft.slice(0, 300) }).eq("id", user.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setProfile((p) => (p ? { ...p, bio: bioDraft.slice(0, 300) } : p));
    setEditBio(false);
    toast({ title: "Bio atualizada!" });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  const initials = profile.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-hero px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <Link to="/volunteers" className="text-primary-foreground p-1.5 -ml-1.5 rounded-full hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-primary-foreground truncate">{profile.full_name}</h1>
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/85 mt-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              <span className="truncate">{profile.volunteer_credential || "Voluntário"}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-primary-foreground mt-1.5 font-semibold">
              <span className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" /> Nível {profile.volunteer_level}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {hours.toFixed(1)}h
              </span>
              <span>{posts.length} posts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5">
        {editBio ? (
          <div className="space-y-2">
            <Textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Conte um pouco sobre você..."
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setBioDraft(profile.bio ?? ""); setEditBio(false); }}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={saveBio}>
                <Check className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground flex-1 whitespace-pre-wrap break-words">
              {profile.bio || (isMe ? <span className="text-muted-foreground italic">Adicione uma bio...</span> : <span className="text-muted-foreground italic">Sem bio</span>)}
            </p>
            {isMe && (
              <button onClick={() => setEditBio(true)} className="text-primary p-1">
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {!isMe && (
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setDmOpen(true)} className="flex-1" size="sm">
              <Send className="h-4 w-4 mr-1.5" /> Mensagem
            </Button>
            <Button onClick={() => setMotOpen(true)} variant="outline" className="flex-1" size="sm">
              <Sparkles className="h-4 w-4 mr-1.5" /> Motivar
            </Button>
          </div>
        )}
      </div>

      <div className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Postagens</h2>
        {posts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-12">Nenhuma postagem ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/post/${p.id}`}
                className="aspect-square bg-muted rounded-md overflow-hidden block active:opacity-80"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full p-2 flex items-center justify-center text-[10px] text-foreground text-center bg-gradient-to-br from-primary/15 to-primary/5">
                    <span className="line-clamp-5">{p.content}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <DirectMessageDialog
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        recipientId={profile.id}
        recipientName={profile.full_name}
        recipientAvatar={profile.avatar_url}
      />
      <MotivationalModal
        open={motOpen}
        onClose={() => setMotOpen(false)}
        recipientId={profile.id}
        recipientName={profile.full_name}
      />

      <BottomNav />
    </div>
  );
}
