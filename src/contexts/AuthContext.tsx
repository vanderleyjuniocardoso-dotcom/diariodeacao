import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  gglAdminGroupId: string | null;
  profile: { full_name: string; email: string; phone: string | null; unit: string | null; avatar_url: string | null; volunteer_level?: number | null; volunteer_credential?: string | null; ggl_id?: string | null } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, isAdmin: false, gglAdminGroupId: null, profile: null,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gglAdminGroupId, setGglAdminGroupId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchProfile = async (userId: string) => {
    try {
      await (supabase.rpc as any)("sync_profile_from_registration", { _user_id: userId });
    } catch {}
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) {
      setProfile(data as any);
      // Sincroniza GGL a partir da planilha (col AF) — uma vez por sessão por credencial.
      // Garante que profiles.ggl_id e admin_volunteers.ggl_id fiquem sempre populados,
      // refletindo automaticamente no bloco GGL do ADM e no espaço do ADM do GGL.
      const credential = (data as any)?.volunteer_credential?.trim();
      if (credential && typeof window !== "undefined") {
        const cacheKey = `ggl_sync_${credential}`;
        if (!sessionStorage.getItem(cacheKey)) {
          sessionStorage.setItem(cacheKey, "1");
          (async () => {
            try {
              const { data: sh } = await supabase.functions.invoke("sheet-hours", { body: { credential } });
              const gglName = (sh?.gglName ?? "").toString().trim();
              if (gglName) {
                await (supabase.rpc as any)("link_volunteer_ggl_by_name", { _ggl_name: gglName });
                const { data: refreshed } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
                if (refreshed) setProfile(refreshed as any);
              }
            } catch (e) {
              console.warn("GGL sync from sheet failed", e);
            }
          })();
        }
      }
    }
  };

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  };

  const checkGglAdmin = async () => {
    try {
      const { data } = await (supabase.rpc as any)("get_my_ggl_admin_group");
      setGglAdminGroupId((data as string) || null);
    } catch {
      setGglAdminGroupId(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const hydrateSession = (session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      const uid = session.user.id;
      fetchProfile(uid).catch(() => {});
      checkAdmin(uid).catch(() => {});
      checkGglAdmin().catch(() => {});
      import("@/lib/push").then(({ savePushSubscription, isInIframe }) => {
        if (!isInIframe && "Notification" in window && Notification.permission === "granted") {
          savePushSubscription(uid).catch(() => {});
        }
      }).catch(() => {});
    } else {
      setProfile(null);
      setIsAdmin(false);
      setGglAdminGroupId(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ user, session, loading, isAdmin, gglAdminGroupId, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
