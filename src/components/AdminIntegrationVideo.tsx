import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2, Video } from "lucide-react";

const AdminIntegrationVideo = () => {
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "integration_video_url").maybeSingle()
      .then(({ data }) => {
        const v = data?.value as any;
        if (v?.url) setUrl(v.url);
      });
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) { toast.error("Vídeo até 200MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `integration-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("integration-video").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("integration-video").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const newUrl = signed?.signedUrl;
      if (!newUrl) throw new Error("Falha ao gerar URL");
      const { error } = await supabase.from("app_settings").upsert({ key: "integration_video_url", value: { url: newUrl, path } });
      if (error) throw error;
      setUrl(newUrl);
      toast.success("Vídeo de integração atualizado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar vídeo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Vídeo de Integração</h3>
      </div>
      <p className="text-xs text-muted-foreground">Este vídeo aparece para o voluntário ao concluir 100% da capacitação Magna.</p>

      {url && (
        <video src={url} controls className="w-full rounded-lg max-h-48 bg-black" />
      )}

      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onFile} />
      <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="h-3.5 w-3.5 mr-1.5" />{url ? "Substituir vídeo" : "Enviar vídeo"}</>}
      </Button>
    </div>
  );
};

export default AdminIntegrationVideo;
