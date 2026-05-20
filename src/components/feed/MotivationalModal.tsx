import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const PRESETS = [
  "Você é incrível! Continue brilhando ✨",
  "Seu trabalho transforma vidas. Obrigado por existir! 💙",
  "Hoje você fez a diferença. Tenha um dia abençoado!",
  "Sua dedicação inspira a todos nós. 🌟",
  "Lembre-se: pequenas ações geram grandes mudanças.",
  "Você é luz na vida de muitas pessoas. 🕊️",
];

interface Props {
  open: boolean;
  onClose: () => void;
  recipientId: string | null;
  recipientName: string | null;
}

export default function MotivationalModal({ open, onClose, recipientId, recipientName }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [preset, setPreset] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user || !recipientId) return;
    const final = (content.trim() || preset || "").trim();
    if (!final) {
      toast({ title: "Escreva ou escolha uma mensagem", variant: "destructive" });
      return;
    }
    if (final.length > 500) {
      toast({ title: "Mensagem muito longa (máx 500)", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("motivational_messages").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      content: final,
      preset,
    });
    if (error) {
      setSending(false);
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    supabase.functions
      .invoke("send-push", {
        body: {
          recipient_id: recipientId,
          title: `💙 Mensagem motivacional de ${profile?.full_name ?? "um voluntário"}`,
          message: final,
          url: "/volunteers",
        },
      })
      .catch(() => {});
    setSending(false);
    toast({ title: "Motivação enviada! 💙" });
    setContent("");
    setPreset(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Enviar motivação
          </DialogTitle>
          <DialogDescription>
            Mande uma palavra de incentivo para {recipientName ?? "este voluntário"}. 💙
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sugestões rápidas</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPreset(p);
                  setContent(p);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  preset === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 border-border hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setPreset(null);
          }}
          placeholder="Ou escreva sua própria mensagem..."
          rows={3}
          maxLength={500}
          className="resize-none"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
