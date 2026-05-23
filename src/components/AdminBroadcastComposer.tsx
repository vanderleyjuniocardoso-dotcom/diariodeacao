import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

export default function AdminBroadcastComposer() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user || !title.trim() || !message.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("admin_broadcasts")
      .insert({ sender_id: user.id, title: title.trim(), message: message.trim() });
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar aviso");
      return;
    }
    toast.success("Aviso enviado a todos os voluntários!");

    supabase.functions
      .invoke("send-push", {
        body: {
          broadcast: true,
          title: `📢 ${title.trim()}`,
          body: message.trim(),
          url: "/volunteers",
        },
      })
      .catch(() => {});

    setTitle("");
    setMessage("");
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Mensagem do ADM para todos os voluntários</h3>
      </div>
      <Input
        placeholder="Título do aviso"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <Textarea
        placeholder="Escreva a mensagem que será enviada a todos os voluntários..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={1000}
      />
      <Button onClick={send} disabled={sending || !title.trim() || !message.trim()} className="w-full">
        {sending ? "Enviando..." : "Enviar para todos"}
      </Button>
    </div>
  );
}
