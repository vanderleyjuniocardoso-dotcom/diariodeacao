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
    await (supabase.rpc as any)("sync_profile_from_registration", { _user_id: userId }).catch(() => {});
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!data) return;
    setProfile(data);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const hydrateSession = async (session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      await Promise.all([fetchProfile(session.user.id), checkAdmin(session.user.id)]);
      import("@/lib/push").then(({ savePushSubscription, isInIframe }) => {
        if (!isInIframe && "Notification" in window && Notification.permission === "granted") {
          savePushSubscription(session.user.id).catch(() => {});
        }
      }).catch(() => {});
    } else {
      setProfile(null);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          hydrateSession(session);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateSession(session);
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
