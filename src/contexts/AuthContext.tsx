import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  profile: { full_name: string; email: string; phone: string | null; unit: string | null; avatar_url: string | null; volunteer_level?: number | null; volunteer_credential?: string | null } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, isAdmin: false, profile: null,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!data) return;
    // Backfill credential + avatar from admin_volunteers / volunteer_registrations if missing
    try {
      const needsCred = !data.volunteer_credential;
      const needsAvatar = !data.avatar_url;
      if ((needsCred || needsAvatar) && data.cpf) {
        const patch: any = {};
        if (needsCred) {
          const { data: av } = await supabase
            .from("admin_volunteers")
            .select("credencial")
            .eq("cpf", data.cpf)
            .maybeSingle();
          if (av?.credencial) patch.volunteer_credential = av.credencial;
        }
        if (needsAvatar) {
          const { data: reg } = await (supabase.from as any)("volunteer_registrations")
            .select("photo_url")
            .eq("cpf", data.cpf)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (reg?.photo_url) patch.avatar_url = reg.photo_url;
        }
        if (Object.keys(patch).length > 0) {
          const { data: updated } = await supabase
            .from("profiles")
            .update(patch)
            .eq("id", userId)
            .select("*")
            .maybeSingle();
          if (updated) {
            setProfile(updated);
            return;
          }
        }
      }
    } catch (e) {
      console.error("profile backfill failed", e);
    }
    setProfile(data);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime: refresh profile when admin updates it (e.g. credencial)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile(payload.new as any);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
