import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, PartyPopper, Clock, PlayCircle, Send, CheckCircle2 } from "lucide-react";
import { onlyDigits } from "@/lib/cpf";

interface Booking { id: string; slot_id: string; attended: boolean; }
interface Slot { id: string; slot_date: string; slot_time: string; month: number; }
interface Enrollment { id: string; class_code: string; started: boolean; progress: number; video_watched: boolean; }
interface AccessReq { id: string; status: string; }

const MinhaJornada = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateAny = (location.state || {}) as { cpf?: string; registrationId?: string };
  const cpf = stateAny.cpf ? onlyDigits(stateAny.cpf) : "";

  const [loading, setLoading] = useState(true);
  const [regId, setRegId] = useState<string | null>(stateAny.registrationId || null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [accessReq, setAccessReq] = useState<AccessReq | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const load = async () => {
    if (!cpf && !regId) { navigate("/cpf-gate", { replace: true }); return; }
    let regIdLocal = regId;
    if (!regIdLocal && cpf) {
      const { data } = await supabase.from("volunteer_registrations").select("id").eq("cpf", cpf).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if (data) { regIdLocal = data.id; setRegId(data.id); }
    }
    if (!regIdLocal) { setLoading(false); return; }

    const { data: b } = await supabase.rpc("get_my_booking", { _registration_id: regIdLocal });
    const bookingRow = Array.isArray(b) && b.length ? (b[0] as any) : null;
    setBooking(bookingRow as Booking | null);

    if (bookingRow) {
      const { data: s } = await supabase.from("welcome_meeting_slots").select("id, slot_date, slot_time, month").eq("id", bookingRow.slot_id).maybeSingle();
      setSlot((s as Slot) || null);
    }

    const { data: e } = await supabase.rpc("get_my_enrollment", { _registration_id: regIdLocal });
    const enrollmentRow = Array.isArray(e) && e.length ? (e[0] as any) : null;
    setEnrollment(enrollmentRow as Enrollment | null);

    if (enrollmentRow) {
      const { data: r } = await supabase.rpc("get_my_access_request", { _enrollment_id: enrollmentRow.id });
      const reqRow = Array.isArray(r) && r.length ? (r[0] as any) : null;
      setAccessReq(reqRow as AccessReq | null);
    }


    const { data: setting } = await supabase.from("app_settings").select("value").eq("key","integration_video_url").maybeSingle();
    if (setting?.value && typeof setting.value === "object" && "url" in (setting.value as any)) {
      setVideoUrl((setting.value as any).url);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // polling (substitui realtime, pois agora as tabelas não são lidas por anon)
  useEffect(() => {
    if (!regId) return;
    const id = setInterval(() => { load(); }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [regId]);


  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Voluntagram aprovado → leva pro signup
  if (accessReq?.status === "approved") {
    return (
      <Wrapper>
        <PartyPopper className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Acesso liberado!</h1>
        <p className="text-sm text-muted-foreground mb-6">A equipe do CEJAM autorizou seu acesso ao VOLUNTAGRAM. Crie sua conta para começar.</p>
        <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/cpf-gate")}>Criar minha conta</Button>
      </Wrapper>
    );
  }

  // Video flow
  if (enrollment?.progress === 100) {
    if (showVideo && videoUrl) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
          <video src={videoUrl} controls autoPlay className="max-w-full max-h-[80vh] rounded-lg" onEnded={async () => {
            await supabase.rpc("mark_video_watched", { _enrollment_id: enrollment.id });
            setEnrollment({ ...enrollment, video_watched: true });
            setShowVideo(false);
          }} />
        </div>
      );
    }
    if (enrollment.video_watched) {
      if (accessReq) {
        return (
          <Wrapper>
            <Clock className="h-14 w-14 text-primary mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Solicitação enviada</h1>
            <p className="text-sm text-muted-foreground">Aguarde a equipe autorizar seu acesso ao VOLUNTAGRAM.</p>
          </Wrapper>
        );
      }
      return (
        <Wrapper>
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
          <h1 className="text-lg font-bold mb-3">Vídeo concluído!</h1>
          <p className="text-sm text-muted-foreground mb-6">Solicite agora seu acesso ao VOLUNTAGRAM para usar o app.</p>
          <Button variant="hero" size="lg" className="w-full" onClick={async () => {
            const { error } = await supabase.rpc("request_voluntagram_access", { _enrollment_id: enrollment.id });
            if (error) { toast.error(error.message); return; }
            toast.success("Solicitação enviada");
            load();
          }}>
            <Send className="h-4 w-4 mr-2" />Pedir autorização para o VOLUNTAGRAM
          </Button>
        </Wrapper>
      );
    }
    return (
      <Wrapper>
        <PartyPopper className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-lg font-bold mb-3">PARABÉNS, VOCÊ CONCLUIU A CAPACITAÇÃO MAGNA.</h1>
        <p className="text-sm text-muted-foreground mb-6">VEJA AGORA O VIDEO DE INTEGRAÇÃO DO PROGRAMA.</p>
        {videoUrl ? (
          <Button variant="hero" size="lg" className="w-full" onClick={() => setShowVideo(true)}>
            <PlayCircle className="h-4 w-4 mr-2" />Iniciar vídeo de integração
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground italic">Aguarde o ADM disponibilizar o vídeo.</p>
        )}
      </Wrapper>
    );
  }

  // Magna em andamento
  if (enrollment?.started) {
    return (
      <Wrapper>
        <h1 className="text-lg font-bold mb-2">Você começou a Capacitação Magna</h1>
        <p className="text-sm text-muted-foreground mb-4">Turma {enrollment.class_code} · veja sua progressão:</p>
        <Progress value={enrollment.progress} className="h-3" />
        <p className="text-sm font-bold text-primary mt-2">{enrollment.progress}%</p>
      </Wrapper>
    );
  }

  // Recebeu check, aguardando início da capacitação
  if (enrollment && !enrollment.started) {
    return (
      <Wrapper>
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-lg font-bold mb-3">Parabéns!</h1>
        <p className="text-sm text-muted-foreground">Você passou pela primeira etapa. Aguarde o contato do ADM para iniciar a capacitação Magna.</p>
      </Wrapper>
    );
  }

  // Booking feito, aguardando o dia
  if (booking && slot) {
    return (
      <Wrapper>
        <Clock className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-lg font-bold mb-2">Sua reunião de boas vindas será:</h1>
        <p className="text-xl font-bold text-primary mb-3">
          {new Date(slot.slot_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} às {slot.slot_time.slice(0,5)}
        </p>
        <p className="text-sm text-muted-foreground italic">Sua chegada é motivo de grande alegria para nós.</p>
      </Wrapper>
    );
  }

  // Sem booking → leva pra agendar
  return (
    <Wrapper>
      <h1 className="text-lg font-bold mb-3">Próximo passo</h1>
      <p className="text-sm text-muted-foreground mb-6">Você ainda não escolheu sua reunião de Boas Vindas.</p>
      <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/boas-vindas/agendar", { state: { registrationId: regId, cpf } })}>
        Escolher data
      </Button>
    </Wrapper>
  );
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-hero">
    <div className="max-w-sm w-full bg-card rounded-2xl p-6 shadow-xl text-center animate-fade-up">{children}</div>
  </div>
);

export default MinhaJornada;
