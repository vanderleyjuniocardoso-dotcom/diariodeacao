import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, Loader2, CheckCircle2 } from "lucide-react";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface Slot { id: string; month: number; slot_date: string; slot_time: string; capacity: number; }
interface Booking { id: string; slot_id: string; }

const AgendarBoasVindas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const st = (location.state || {}) as { registrationId?: string; cpf?: string; fullName?: string; phone?: string; email?: string };
  const [slots, setSlots] = useState<Slot[]>([]);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!st.registrationId) {
      navigate("/cpf-gate", { replace: true });
      return;
    }
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("welcome_meeting_slots")
        .select("*")
        .gte("slot_date", today)
        .order("slot_date");
      setSlots((data as Slot[]) || []);

      const { data: existing } = await supabase.rpc("get_my_booking", { _registration_id: st.registrationId });
      const existingRow = Array.isArray(existing) && existing.length ? (existing[0] as any) : null;
      if (existingRow) setBooking(existingRow as Booking);

      setLoading(false);
    })();
  }, [st.registrationId, navigate]);

  const choose = async (slot: Slot) => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_booking", {
      _slot_id: slot.id,
      _registration_id: st.registrationId!,
      _volunteer_name: st.fullName || "",
      _volunteer_phone: st.phone || null,
      _volunteer_email: st.email || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) && data.length ? (data[0] as any) : null;
    if (row) setBooking(row as Booking);
    toast.success("Reunião agendada!");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (booking) {
    const slot = slots.find((s) => s.id === booking.slot_id);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-hero text-center">
        <div className="max-w-sm w-full bg-card rounded-2xl p-6 shadow-xl animate-fade-up">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
          <h1 className="text-lg font-bold font-heading text-foreground mb-3">Sua reunião de boas vindas será:</h1>
          {slot && (
            <p className="text-xl font-bold text-primary mb-3">
              {new Date(slot.slot_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} às {slot.slot_time.slice(0,5)}
            </p>
          )}
          <p className="text-sm text-muted-foreground italic mb-6">Sua chegada é motivo de grande alegria para nós.</p>
          <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/minha-jornada", { state: { cpf: st.cpf, registrationId: st.registrationId } })}>
            Acompanhar minha jornada
          </Button>
        </div>
      </div>
    );
  }

  const monthsWithSlots = new Set(slots.map((s) => s.month));
  const currentMonth = new Date().getMonth() + 1;
  const visibleMonths = MONTHS.map((name, idx) => ({ name, month: idx + 1 })).filter((m) => m.month >= currentMonth);

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="gradient-hero px-5 pt-10 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold font-heading text-primary-foreground">Escolha a data da sua reunião de Boas Vindas</h1>
        </div>
        <p className="text-xs text-primary-foreground/80 mt-3 leading-relaxed">
          A reunião de boas vindas é o primeiro contato com a gestão do programa, onde você entenderá os próximos passos da sua jornada como voluntário.
        </p>
      </div>

      <div className="px-5 mt-5 max-w-md mx-auto space-y-2">
        {visibleMonths.map(({ name, month }) => {
          const monthSlots = slots.filter((s) => s.month === month);
          const available = monthSlots.length > 0;
          const open = openMonth === month;
          return (
            <div key={month} className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenMonth(open ? null : month)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />{name}
                </span>
                <span className="text-xs text-muted-foreground">{available ? `${monthSlots.length} datas` : "Aguardando datas"}</span>
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-2">
                  {available ? monthSlots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => choose(s)}
                      disabled={submitting}
                      className="w-full p-3 rounded-lg border hover:bg-primary/5 flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {new Date(s.slot_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" })}
                        {" às "}{s.slot_time.slice(0,5)}
                      </span>
                      <span className="text-primary font-medium">Escolher</span>
                    </button>
                  )) : (
                    <p className="text-xs italic text-muted-foreground text-center py-3">
                      Nenhuma data cadastrada ainda para este mês. Aguarde a equipe do CEJAM publicar.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgendarBoasVindas;
