import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/image";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export default function CreatePostModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máx 20MB", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setContent("");
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const submit = async () => {
    if (!user) return;
    const trimmed = content.trim();
    if (!trimmed && !file) {
      toast({ title: "Escreva algo ou adicione uma foto", variant: "destructive" });
      return;
    }
    if (trimmed.length > 2000) {
      toast({ title: "Texto muito longo (máx 2000)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    let image_url: string | null = null;
    if (file) {
      let toUpload: File;
      try {
        toUpload = await compressImage(file, { maxDim: 1600, quality: 0.82 });
      } catch (err: any) {
        setSubmitting(false);
        toast({ title: "Imagem inválida", description: err.message, variant: "destructive" });
        return;
      }
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("feed-posts").upload(path, toUpload, { cacheControl: "3600", contentType: toUpload.type });
      if (upErr) {
        setSubmitting(false);
        toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
        return;
      }
      const { data } = supabase.storage.from("feed-posts").getPublicUrl(path);
      image_url = data.publicUrl;
    }
    const { error } = await supabase.from("feed_posts").insert({
      user_id: user.id,
      content: trimmed,
      image_url,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao postar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Postagem publicada! 💙" });
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova postagem</DialogTitle>
          <DialogDescription>Compartilhe um momento, uma ação ou uma reflexão.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você quer compartilhar?"
          rows={4}
          maxLength={2000}
          className="resize-none"
        />

        {preview ? (
          <div className="relative rounded-xl overflow-hidden">
            <img src={preview} alt="" className="w-full max-h-64 object-cover" />
            <button
              onClick={() => {
                setFile(null);
                URL.revokeObjectURL(preview);
                setPreview(null);
              }}
              className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:bg-muted/40 transition"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs">Adicionar foto (opcional)</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Publicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
